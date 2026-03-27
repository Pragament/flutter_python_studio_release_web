// --- Globals ---
let monacoEditors = {}; // Object to store editor instances
let pyodide;
let monacoLoaded = false;
let monacoLoadPromise = null;
const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
);

let onConsoleInputRequested = null;
let pendingConsoleInputResolver = null;
let jediAvailable = false;
let pyodideReady = false;
let isVirtualKeyboardEnabled = false; // Track virtual keyboard state

// Set virtual keyboard state from Flutter
window.setVirtualKeyboardEnabled = function(enabled) {
  isVirtualKeyboardEnabled = enabled;
  console.log('Virtual keyboard mode:', enabled ? 'enabled' : 'disabled');
  
  // Update all existing editors
  Object.values(monacoEditors).forEach(editor => {
    updateEditorKeyboardMode(editor, enabled);
  });
};

// Update a single editor's keyboard mode
function updateEditorKeyboardMode(editor, virtualKeyboardEnabled) {
  const editorDomNode = editor.getDomNode();
  if (!editorDomNode) return;
  
  const textArea = editorDomNode.querySelector('textarea');
  if (!textArea) return;
  
  if (virtualKeyboardEnabled) {
    // Virtual keyboard mode: prevent system keyboard
    textArea.setAttribute('readonly', 'readonly');
    textArea.setAttribute('inputmode', 'none');
    textArea.style.caretColor = 'transparent';
  } else {
    // Real keyboard mode: allow system keyboard
    textArea.removeAttribute('readonly');
    textArea.removeAttribute('inputmode');
    textArea.style.caretColor = '';
  }
}

function requestConsoleInput(promptText = "") {
  return new Promise((resolve, reject) => {
    if (pendingConsoleInputResolver) {
      reject(new Error("Another input() request is already pending."));
      return;
    }

    pendingConsoleInputResolver = resolve;

    if (onConsoleInputRequested) {
      onConsoleInputRequested(String(promptText ?? ""));
    }
  });
}


// Helper function to clean common invalid characters from code
function sanitizeCode(code) {
  // Replaces non-breaking spaces and other problematic characters
  return code.replace(/\u00A0/g, " ").replace(/\u2028/g, "\n").replace(/\u2029/g, "\n");
}

function normalizeErrorText(err) {
  if (err == null) {
    return "Unknown Python error";
  }

  if (typeof err === "string") {
    return err;
  }

  if (typeof err.message === "string" && err.message.trim()) {
    return err.message;
  }

  return String(err);
}

function extractUserRelevantPythonError(err) {
  const fullMessage = normalizeErrorText(err).replace(/\r\n/g, "\n").trim();

  if (!fullMessage) {
    return "Unknown Python error";
  }

  const execFrameIndex = fullMessage.indexOf('File "<exec>"');
  if (execFrameIndex >= 0) {
    return fullMessage.slice(execFrameIndex).trim();
  }

  const tracebackIndex = fullMessage.indexOf("Traceback");
  if (tracebackIndex >= 0) {
    return fullMessage.slice(tracebackIndex).trim();
  }

  const lines = fullMessage.split("\n");
  const filteredLines = lines.filter((line) => {
    return !(
      line.includes('File "/lib/python') ||
      line.includes("_pyodide") ||
      line.includes("_base.py")
    );
  });

  return filteredLines.join("\n").trim() || fullMessage;
}

// --- Helper function to format code using Black in Pyodide ---
async function formatPythonCodeWithBlack(code) {
  if (!pyodide) {
    console.error("Pyodide not loaded, cannot format.");
    throw new Error("Pyodide not loaded");
  }

  const sanitizedCode = sanitizeCode(code);

  try {
    // Pass the code to the Python environment
    pyodide.globals.set("unformatted_code", sanitizedCode);

    // Let Pyodide handle exceptions. If this fails, the promise will reject
    // and be caught by the JavaScript 'catch' block.
    const formattedCode = await pyodide.runPythonAsync(`
import black

# Get the code from the global scope
source_code = unformatted_code

# Configure black's formatting mode
mode = black.FileMode(line_length=88, string_normalization=True)

# Format the string. This will raise an exception on invalid syntax.
black.format_str(source_code, mode=mode)
    `);

    return formattedCode;
  } catch (err) {
    // This will now catch Python exceptions directly!
    console.error("Error during Pyodide formatting execution:", err);
    throw err; // Re-throw to be caught by the Monaco format provider
  }
}

// Function to initialize Monaco only once
function loadMonaco() {
  if (!monacoLoadPromise) {
    monacoLoadPromise = new Promise((resolve) => {
      require.config({
        paths: { 'vs': 'https://unpkg.com/monaco-editor@0.41.0/min/vs' }
      });

      require(['vs/editor/editor.main'], () => {
        monacoLoaded = true;
        resolve();
      });
    });
  }
  return monacoLoadPromise;
}

console.log('Monaco Interop JavaScript loaded');

// Pre-define Python suggestions for faster lookup (defined once globally)
const pythonSuggestions = [
  // Keywords
  { label: 'def', kind: 14, insertText: 'def ${1:function_name}(${2:parameters}):\n    ${3:pass}', insertTextRules: 4 },
  { label: 'class', kind: 14, insertText: 'class ${1:ClassName}:\n    def __init__(self${2:, args}):\n        ${3:pass}', insertTextRules: 4 },
  { label: 'if', kind: 14, insertText: 'if ${1:condition}:\n    ${2:pass}', insertTextRules: 4 },
  { label: 'elif', kind: 14, insertText: 'elif ${1:condition}:\n    ${2:pass}', insertTextRules: 4 },
  { label: 'else', kind: 14, insertText: 'else:\n    ${1:pass}', insertTextRules: 4 },
  { label: 'for', kind: 14, insertText: 'for ${1:item} in ${2:iterable}:\n    ${3:pass}', insertTextRules: 4 },
  { label: 'while', kind: 14, insertText: 'while ${1:condition}:\n    ${2:pass}', insertTextRules: 4 },
  { label: 'try', kind: 14, insertText: 'try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:pass}', insertTextRules: 4 },
  { label: 'except', kind: 14, insertText: 'except ${1:Exception} as ${2:e}:\n    ${3:pass}', insertTextRules: 4 },
  { label: 'finally', kind: 14, insertText: 'finally:\n    ${1:pass}', insertTextRules: 4 },
  { label: 'with', kind: 14, insertText: 'with ${1:expression} as ${2:variable}:\n    ${3:pass}', insertTextRules: 4 },
  { label: 'import', kind: 14, insertText: 'import ${1:module}', insertTextRules: 4 },
  { label: 'from', kind: 14, insertText: 'from ${1:module} import ${2:name}', insertTextRules: 4 },
  { label: 'return', kind: 14, insertText: 'return ${1:value}', insertTextRules: 4 },
  { label: 'yield', kind: 14, insertText: 'yield ${1:value}', insertTextRules: 4 },
  { label: 'break', kind: 14, insertText: 'break' },
  { label: 'continue', kind: 14, insertText: 'continue' },
  { label: 'pass', kind: 14, insertText: 'pass' },
  { label: 'lambda', kind: 14, insertText: 'lambda ${1:args}: ${2:expression}', insertTextRules: 4 },
  { label: 'async', kind: 14, insertText: 'async def ${1:function_name}(${2:parameters}):\n    ${3:pass}', insertTextRules: 4 },
  { label: 'await', kind: 14, insertText: 'await ${1:expression}', insertTextRules: 4 },
  { label: 'global', kind: 14, insertText: 'global ${1:variable}', insertTextRules: 4 },
  { label: 'nonlocal', kind: 14, insertText: 'nonlocal ${1:variable}', insertTextRules: 4 },
  { label: 'raise', kind: 14, insertText: 'raise ${1:Exception}', insertTextRules: 4 },
  { label: 'assert', kind: 14, insertText: 'assert ${1:condition}', insertTextRules: 4 },
  { label: 'del', kind: 14, insertText: 'del ${1:variable}', insertTextRules: 4 },
  
  // Additional 'p' keywords and decorators
  { label: 'property', kind: 10, insertText: '@property\ndef ${1:name}(self):\n    return ${2:value}', insertTextRules: 4 },
  { label: 'partial', kind: 3, insertText: 'partial(${1:func}, ${2:args})', insertTextRules: 4 },
  { label: 'pathlib', kind: 9, insertText: 'from pathlib import Path', insertTextRules: 4 },
  
  // Built-in functions
  { label: 'print', kind: 3, insertText: 'print(${1:value})', insertTextRules: 4 },
  { label: 'len', kind: 3, insertText: 'len(${1:obj})', insertTextRules: 4 },
  { label: 'range', kind: 3, insertText: 'range(${1:stop})', insertTextRules: 4 },
  { label: 'enumerate', kind: 3, insertText: 'enumerate(${1:iterable})', insertTextRules: 4 },
  { label: 'zip', kind: 3, insertText: 'zip(${1:iterable1}, ${2:iterable2})', insertTextRules: 4 },
  { label: 'map', kind: 3, insertText: 'map(${1:function}, ${2:iterable})', insertTextRules: 4 },
  { label: 'filter', kind: 3, insertText: 'filter(${1:function}, ${2:iterable})', insertTextRules: 4 },
  { label: 'sorted', kind: 3, insertText: 'sorted(${1:iterable})', insertTextRules: 4 },
  { label: 'sum', kind: 3, insertText: 'sum(${1:iterable})', insertTextRules: 4 },
  { label: 'max', kind: 3, insertText: 'max(${1:iterable})', insertTextRules: 4 },
  { label: 'min', kind: 3, insertText: 'min(${1:iterable})', insertTextRules: 4 },
  { label: 'abs', kind: 3, insertText: 'abs(${1:number})', insertTextRules: 4 },
  { label: 'round', kind: 3, insertText: 'round(${1:number})', insertTextRules: 4 },
  { label: 'input', kind: 3, insertText: 'input(${1:prompt})', insertTextRules: 4 },
  { label: 'open', kind: 3, insertText: 'open(${1:filename}, ${2:mode})', insertTextRules: 4 },
  { label: 'type', kind: 3, insertText: 'type(${1:obj})', insertTextRules: 4 },
  { label: 'isinstance', kind: 3, insertText: 'isinstance(${1:obj}, ${2:type})', insertTextRules: 4 },
  { label: 'hasattr', kind: 3, insertText: 'hasattr(${1:obj}, ${2:attr})', insertTextRules: 4 },
  { label: 'getattr', kind: 3, insertText: 'getattr(${1:obj}, ${2:attr})', insertTextRules: 4 },
  { label: 'setattr', kind: 3, insertText: 'setattr(${1:obj}, ${2:attr}, ${3:value})', insertTextRules: 4 },
  { label: 'pow', kind: 3, insertText: 'pow(${1:base}, ${2:exp})', insertTextRules: 4 },
  
  // Built-in types
  { label: 'str', kind: 7, insertText: 'str(${1:obj})', insertTextRules: 4 },
  { label: 'int', kind: 7, insertText: 'int(${1:obj})', insertTextRules: 4 },
  { label: 'float', kind: 7, insertText: 'float(${1:obj})', insertTextRules: 4 },
  { label: 'bool', kind: 7, insertText: 'bool(${1:obj})', insertTextRules: 4 },
  { label: 'list', kind: 7, insertText: 'list(${1:iterable})', insertTextRules: 4 },
  { label: 'tuple', kind: 7, insertText: 'tuple(${1:iterable})', insertTextRules: 4 },
  { label: 'dict', kind: 7, insertText: 'dict(${1:mapping})', insertTextRules: 4 },
  { label: 'set', kind: 7, insertText: 'set(${1:iterable})', insertTextRules: 4 },
  
  // Constants
  { label: 'True', kind: 21, insertText: 'True' },
  { label: 'False', kind: 21, insertText: 'False' },
  { label: 'None', kind: 21, insertText: 'None' },
  
  // Magic methods
  { label: '__init__', kind: 2, insertText: 'def __init__(self${1:, args}):\n    ${2:pass}', insertTextRules: 4 },
  { label: '__str__', kind: 2, insertText: 'def __str__(self):\n    return ${1:"string representation"}', insertTextRules: 4 },
  { label: '__repr__', kind: 2, insertText: 'def __repr__(self):\n    return ${1:"repr string"}', insertTextRules: 4 },
  { label: '__len__', kind: 2, insertText: 'def __len__(self):\n    return ${1:length}', insertTextRules: 4 }
];

function mapCompletionKind(type) {
  if (!window.monaco) {
    return 9;
  }

  switch (type) {
    case 'function':
      return monaco.languages.CompletionItemKind.Function;
    case 'class':
      return monaco.languages.CompletionItemKind.Class;
    case 'module':
      return monaco.languages.CompletionItemKind.Module;
    case 'instance':
      return monaco.languages.CompletionItemKind.Variable;
    case 'param':
      return monaco.languages.CompletionItemKind.Variable;
    case 'path':
      return monaco.languages.CompletionItemKind.File;
    case 'keyword':
      return monaco.languages.CompletionItemKind.Keyword;
    case 'statement':
      return monaco.languages.CompletionItemKind.Keyword;
    case 'property':
      return monaco.languages.CompletionItemKind.Property;
    default:
      return monaco.languages.CompletionItemKind.Text;
  }
}

function fallbackSuggestions(partialWord, range) {
  return pythonSuggestions
    .filter((suggestion) => !partialWord || suggestion.label.toLowerCase().startsWith(partialWord))
    .map((suggestion) => ({ ...suggestion, range }));
}

async function ensureJediLoaded() {
  if (!pyodide || jediAvailable) {
    return jediAvailable;
  }

  try {
    await pyodide.runPythonAsync('import jedi');
    jediAvailable = true;
    return true;
  } catch (error) {
    console.error('Jedi import failed:', error);
    return false;
  }
}

async function fetchJediCompletions(code, lineNumber, column) {
  if (!pyodideReady) {
    return [];
  }

  const hasJedi = await ensureJediLoaded();
  if (!hasJedi) {
    return [];
  }

  pyodide.globals.set("__completion_source__", String(code ?? ""));

  const rawResult = await pyodide.runPythonAsync(`
import json
import jedi

script = jedi.Script(__completion_source__)
completions = script.complete(${lineNumber}, ${column})

json.dumps([
    {
        "name": completion.name,
        "type": completion.type,
        "description": (completion.docstring() or "")[:180],
    }
    for completion in completions[:30]
])
  `);

  return JSON.parse(rawResult);
}

async function fetchJediDefinitions(code) {
  if (!pyodideReady) {
    return [];
  }

  const hasJedi = await ensureJediLoaded();
  if (!hasJedi) {
    return [];
  }

  pyodide.globals.set("__analysis_source__", String(code ?? ""));

  const rawResult = await pyodide.runPythonAsync(`
import json
import jedi

script = jedi.Script(__analysis_source__)
names = script.get_names(all_scopes=True, definitions=True)

json.dumps([
    {
        "name": name.name,
        "type": name.type,
        "line": name.line or 0,
        "column": name.column or 0,
        "description": (name.docstring() or "")[:120],
    }
    for name in names[:50]
])
  `);

  return JSON.parse(rawResult);
}

// Global flag to ensure completion provider is registered only once
let pythonCompletionProviderRegistered = false;

// Register Python completion provider globally (only once)
function registerPythonCompletionProvider() {
  if (pythonCompletionProviderRegistered || !window.monaco) {
    return;
  }
  
  monaco.languages.registerCompletionItemProvider('python', {
    provideCompletionItems: async function(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      const partialWord = word.word.toLowerCase();

      try {
        const jediCompletions = await fetchJediCompletions(
          model.getValue(),
          position.lineNumber,
          Math.max(0, position.column - 1)
        );

        if (jediCompletions.length > 0) {
          return {
            suggestions: jediCompletions.map((completion) => ({
              label: completion.name,
              kind: mapCompletionKind(completion.type),
              insertText: completion.name,
              detail: completion.type,
              documentation: completion.description || '',
              range
            }))
          };
        }
      } catch (error) {
        console.error('Jedi completion error:', error);
      }

      return { suggestions: fallbackSuggestions(partialWord, range) };
    }
  });
  
  pythonCompletionProviderRegistered = true;
  console.log('Python completion provider registered');
}

// --- Monaco Interop ---
window.monacoInterop = {
  init: async (containerId, initialCode, theme, fontSize, onContentChanged) => {
    console.log('Monaco init called for:', containerId);
    try {
      // Check if DOM element exists
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(`DOM element with ID '${containerId}' not found`);
      }
      console.log('DOM element found for:', containerId);

      // Ensure Monaco is loaded first
      if (!monacoLoaded) {
        await loadMonaco();
      }

      const editor = monaco.editor.create(container, {
        value: initialCode,
        language: 'python',
        theme: theme,
        fontSize: fontSize,
        automaticLayout: true,
        formatOnPaste: true,
        formatOnType: false,
        wordWrap: 'on',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        renderLineHighlight: 'line',
        selectOnLineNumbers: true,
        // Enhanced autocomplete settings for instant response
        quickSuggestions: true, // Enable for all contexts
        quickSuggestionsDelay: 0, // Instant suggestions
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnCommitCharacter: true,
        acceptSuggestionOnEnter: 'on',
        wordBasedSuggestions: false, // Disable default word-based suggestions to prevent duplicates
        tabCompletion: 'on',
        parameterHints: { 
          enabled: true,
          cycle: true
        },
        suggest: {
          showKeywords: true,
          showSnippets: true,
          showFunctions: true,
          showConstructors: true,
          showFields: true,
          showVariables: true,
          showClasses: true,
          showStructs: true,
          showInterfaces: true,
          showModules: true,
          showProperties: true,
          showEvents: true,
          showOperators: true,
          showUnits: true,
          showValues: true,
          showConstants: true,
          showEnums: true,
          showEnumMembers: true,
          showWords: false, // Disable word suggestions to avoid duplicates
          showColors: true,
          showFiles: true,
          showReferences: true,
          showFolders: true,
          showTypeParameters: true,
          filterGraceful: true,
          snippetsPreventQuickSuggestions: false,
          insertMode: 'insert',
          localityBonus: true,
          delay: 0, // No delay for suggestions
          maxVisibleSuggestions: 12 // Show more suggestions
        },
        // Disable system keyboard on mobile
        readOnly: false,
        contextmenu: false,
        // Prevent virtual keyboard on mobile
        'semanticHighlighting.enabled': false
      });

      // Store the editor instance
      monacoEditors[containerId] = editor;

      // Register the Python completion provider globally (only once)
      registerPythonCompletionProvider();

      // Prevent system keyboard and handle touch-to-set-cursor on mobile devices
      const editorDomNode = editor.getDomNode();
      if (editorDomNode && isMobileDevice) {
        // Touch-to-set-cursor handler: sets cursor position at touch coordinates
        const handleTouchToSetCursor = (e) => {
          const touch = e.touches[0] || e.changedTouches[0];
          if (touch) {
            const target = editor.getTargetAtClientPoint(touch.clientX, touch.clientY);
            if (target && target.position) {
              editor.setPosition(target.position);
              editor.focus();
            }
          }
        };

        // Add touch listeners that respect virtual keyboard setting
        editorDomNode.addEventListener('touchstart', (e) => {
          if (isVirtualKeyboardEnabled) {
            // Virtual keyboard mode: prevent system keyboard
            e.preventDefault();
            e.stopPropagation();
            handleTouchToSetCursor(e);
          }
          // Real keyboard mode: let default behavior happen (system keyboard shows)
        }, { passive: false });

        editorDomNode.addEventListener('touchend', (e) => {
          if (isVirtualKeyboardEnabled) {
            // Virtual keyboard mode: prevent system keyboard
            e.preventDefault();
            e.stopPropagation();
          }
          // Real keyboard mode: let default behavior happen
        }, { passive: false });

        // Set initial keyboard mode
        updateEditorKeyboardMode(editor, isVirtualKeyboardEnabled);
      }

      // Set up content change listener
      editor.onDidChangeModelContent((e) => {
        onContentChanged(editor.getValue());
        
        // Manually trigger suggestions on content change for better responsiveness
        const position = editor.getPosition();
        if (position) {
          const model = editor.getModel();
          const word = model.getWordUntilPosition(position);
          
          // Trigger suggestions if user is typing a word (not deleting or just whitespace)
          if (word.word.length > 0 && e.changes.some(change => change.text.length > 0)) {
            setTimeout(() => {
              editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
            }, 10);
          }
        }
      });

      return editor;
    } catch (error) {
      console.error('Error creating Monaco editor:', error);
      throw error;
    }
  },

  getValue: (containerId) => {
    const editor = monacoEditors[containerId];
    return editor ? editor.getValue() : '';
  },

  setValue: (containerId, content) => {
    const editor = monacoEditors[containerId];
    if (editor) {
      editor.setValue(content);
    }
  },

  updateOptions: (containerId, theme, fontSize) => {
    const editor = monacoEditors[containerId];
    if (editor) {
      editor.updateOptions({ theme, fontSize });
    }
  },

  formatDocument: (containerId) => {
    const editor = monacoEditors[containerId];
    if (editor) {
      try {
        // For Python, implement proper indentation that fixes bad indentation
        const model = editor.getModel();
        const value = model.getValue();
        
        // Split into lines and fix indentation
        const lines = value.split('\n');
        const formattedLines = [];
        let currentIndentLevel = 0;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();
          
          // Skip empty lines - preserve them as is
          if (trimmedLine === '') {
            formattedLines.push('');
            continue;
          }
          
          // Check if this line should decrease indentation
          if (trimmedLine.match(/^(except|elif|else|finally):/)) {
            currentIndentLevel = Math.max(0, currentIndentLevel - 1);
          }
          
          // Determine if this should be at top level (unindented)
          // Top level: function definitions, class definitions, imports, top-level statements that don't follow a colon
          let shouldBeTopLevel = false;
          
          if (i === 0) {
            // First line is always top level
            shouldBeTopLevel = true;
          } else {
            // Check if this looks like a top-level statement
            if (trimmedLine.match(/^(def |class |import |from |if __name__|#|@)/)) {
              shouldBeTopLevel = true;
              currentIndentLevel = 0;
            } else {
              // Look back to see if we're following a function/class definition or other top-level code
              let foundTopLevelContext = false;
              for (let j = i - 1; j >= 0; j--) {
                const prevLine = lines[j].trim();
                if (prevLine === '') continue; // Skip empty lines
                
                // If previous line was a function/class definition, we should be indented
                if (prevLine.match(/^(def |class |if |for |while |try:|with |except|elif|else:)/)) {
                  foundTopLevelContext = false;
                  break;
                }
                
                // If previous line was clearly top-level, and this line doesn't look like it should be indented
                if (prevLine.match(/^(import |from |#|@)/) || 
                    (!prevLine.endsWith(':') && !prevLine.match(/^(def |class |if |for |while |try:|with )/))) {
                  // Check if current line looks like it should be top-level
                  if (trimmedLine.match(/^(print|[a-zA-Z_][a-zA-Z0-9_]*\s*=|[a-zA-Z_][a-zA-Z0-9_]*\()/)) {
                    foundTopLevelContext = true;
                  }
                  break;
                }
                break;
              }
              
              if (foundTopLevelContext) {
                shouldBeTopLevel = true;
                currentIndentLevel = 0;
              }
            }
          }
          
          // Apply indentation
          if (shouldBeTopLevel) {
            formattedLines.push(trimmedLine);
            currentIndentLevel = 0;
          } else {
            // Use current indent level
            formattedLines.push('    '.repeat(currentIndentLevel) + trimmedLine);
          }
          
          // Increase indent for lines ending with ':' (but not comments)
          if (trimmedLine.endsWith(':') && !trimmedLine.trimStart().startsWith('#')) {
            currentIndentLevel++;
          }
        }
        
        // Set the formatted code back to the editor
        model.setValue(formattedLines.join('\n'));
      } catch (error) {
        console.log('Python formatting failed, using Monaco default:', error);
        // Fallback to Monaco's built-in formatter
        try {
          editor.getAction('editor.action.formatDocument').run();
        } catch (fallbackError) {
          console.log('Monaco formatter also failed:', fallbackError);
        }
      }
    }
  },

  selectAll: (containerId) => {
    const editor = monacoEditors[containerId];
    if (editor) {
      editor.setSelection(editor.getModel().getFullModelRange());
    }
  },

  insertText: (containerId, text) => {
    const editor = monacoEditors[containerId];
    if (editor) {
      editor.trigger('keyboard', 'type', { text });
    }
  },

  copySelection: (containerId) => {
    const editor = monacoEditors[containerId];
    if (editor) {
      const selection = editor.getSelection();
      const text = editor.getModel().getValueInRange(selection);
      navigator.clipboard.writeText(text);
    }
  },

  getSelectedText: (containerId) => {
    const editor = monacoEditors[containerId];
    if (!editor) {
      return '';
    }

    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) {
      return '';
    }

    return editor.getModel().getValueInRange(selection);
  },

  setAutocomplete: (containerId, enabled) => {
    const editor = monacoEditors[containerId];
    if (editor) {
      editor.updateOptions({
        quickSuggestions: enabled ? {
          other: true,
          comments: false,
          strings: false
        } : false,
        quickSuggestionsDelay: 0, // Instant suggestions
        suggestOnTriggerCharacters: enabled,
        acceptSuggestionOnCommitCharacter: enabled,
        acceptSuggestionOnEnter: enabled ? 'on' : 'off',
        wordBasedSuggestions: enabled,
        parameterHints: { 
          enabled: enabled,
          cycle: enabled
        },
        suggest: {
          showKeywords: enabled,
          showSnippets: enabled,
          showFunctions: enabled,
          showConstructors: enabled,
          showFields: enabled,
          showVariables: enabled,
          showClasses: enabled,
          showStructs: enabled,
          showInterfaces: enabled,
          showModules: enabled,
          showProperties: enabled,
          showEvents: enabled,
          showOperators: enabled,
          showUnits: enabled,
          showValues: enabled,
          showConstants: enabled,
          showEnums: enabled,
          showEnumMembers: enabled,
          showWords: enabled,
          showColors: enabled,
          showFiles: enabled,
          showReferences: enabled,
          showFolders: enabled,
          showTypeParameters: enabled,
          filterGraceful: enabled,
          snippetsPreventQuickSuggestions: false,
          insertMode: 'insert',
          localityBonus: enabled,
          delay: 0, // No delay for suggestions
          maxVisibleSuggestions: 12 // Show more suggestions
        }
      });
      
      // Trigger suggestions to show immediately when enabling
      if (enabled) {
        editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
      }
    }
  },

  // Manual trigger for autocomplete suggestions
  triggerAutocomplete: (containerId) => {
    const editor = monacoEditors[containerId];
    if (editor) {
      editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
    }
  }
};

window.destroyMonacoEditor = function(elementId) {
  if(monacoEditors && monacoEditors[elementId]) {
    // Dispose the Monaco editor
    monacoEditors[elementId].dispose();
    delete monacoEditors[elementId];
    
    // Also clear the DOM container
    const container = document.getElementById(elementId);
    if (container) {
      container.innerHTML = '';
    }
  }
}

window.insertTextAtCursor = function(editorId, text) {
  const editor = monacoEditors[editorId];
  if (editor) {
    const selection = editor.getSelection();
    const range = new monaco.Range(
      selection.startLineNumber,
      selection.startColumn,
      selection.endLineNumber,
      selection.endColumn
    );
    editor.executeEdits('keyboard-input', [{
      range: range,
      text: text
    }]);
    editor.focus();
  }
};

window.deleteCharacterBeforeCursor = function(editorId) {
  const editor = monacoEditors[editorId];
  if (editor) {
    const position = editor.getPosition();
    if (position.column > 1) {
      const range = new monaco.Range(
        position.lineNumber,
        position.column - 1,
        position.lineNumber,
        position.column
      );
      editor.executeEdits('backspace', [{
        range: range,
        text: ''
      }]);
    } else if (position.lineNumber > 1) {
      // Handle backspace at beginning of line
      const model = editor.getModel();
      const prevLineLength = model.getLineLength(position.lineNumber - 1);
      const range = new monaco.Range(
        position.lineNumber - 1,
        prevLineLength + 1,
        position.lineNumber,
        1
      );
      editor.executeEdits('backspace', [{
        range: range,
        text: ''
      }]);
    }
    editor.focus();
  }
};

window.moveCursor = function(editorId, direction) {
  const editor = monacoEditors[editorId];
  if (editor) {
    const position = editor.getPosition();
    let newPosition;
    
    switch(direction) {
      case 'up':
        newPosition = { lineNumber: Math.max(1, position.lineNumber - 1), column: position.column };
        break;
      case 'down':
        const lineCount = editor.getModel().getLineCount();
        newPosition = { lineNumber: Math.min(lineCount, position.lineNumber + 1), column: position.column };
        break;
      case 'left':
        if (position.column > 1) {
          newPosition = { lineNumber: position.lineNumber, column: position.column - 1 };
        } else if (position.lineNumber > 1) {
          const prevLineLength = editor.getModel().getLineLength(position.lineNumber - 1);
          newPosition = { lineNumber: position.lineNumber - 1, column: prevLineLength + 1 };
        } else {
          newPosition = position;
        }
        break;
      case 'right':
        const currentLineLength = editor.getModel().getLineLength(position.lineNumber);
        if (position.column <= currentLineLength) {
          newPosition = { lineNumber: position.lineNumber, column: position.column + 1 };
        } else {
          const lineCount = editor.getModel().getLineCount();
          if (position.lineNumber < lineCount) {
            newPosition = { lineNumber: position.lineNumber + 1, column: 1 };
          } else {
            newPosition = position;
          }
        }
        break;
      default:
        newPosition = position;
    }
    
    editor.setPosition(newPosition);
    editor.focus();
  }
};
// --- Pyodide Interop ---
window.pyodideInterop = {
  setInputHandler: (onInputRequested) => {
    onConsoleInputRequested = onInputRequested;
  },

  submitInput: (value) => {
    if (!pendingConsoleInputResolver) {
      return;
    }

    const normalizedValue = String(value ?? "");
    pendingConsoleInputResolver(normalizedValue);
    pendingConsoleInputResolver = null;
  },

  init: (onOutput) => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('Loading Pyodide...');
        pyodide = await loadPyodide();

        pyodide.globals.set("__requestConsoleInput", async (msg = "") => {
          const promptText = String(msg ?? "");

          if (promptText) {
            onOutput(promptText);
          }

          const value = await requestConsoleInput(promptText);
          onOutput(`${value}\n`);
          return value;
        });

        await pyodide.runPythonAsync(`
async def __console_input__(prompt=""):
    value = await __requestConsoleInput(prompt)
    return "" if value is None else str(value)
        `);


        
        // Set up proper output redirection using the modern Pyodide API
        pyodide.setStdout({
          batched: (text) => {
            console.log('Python output:', text);
            onOutput(text);
          }
        });
        
        pyodide.setStderr({
          batched: (text) => {
            console.error('Python error:', text);
            onOutput(text);
          }
        });

        console.log('Installing basic packages...');
        await pyodide.loadPackage(['micropip']);
        const micropip = pyodide.pyimport('micropip');
        await micropip.install('jedi');
        jediAvailable = true;
        pyodideReady = true;
        
        console.log('Pyodide ready for Python execution!');
        resolve('Pyodide initialized successfully with Jedi autocomplete!');
      } catch (err) {
        console.error('Error initializing Pyodide:', err);
        reject(err.toString());
      }
    });
  },

  runCode: async (code) => {
    if (!pyodide) {
      throw new Error('Pyodide not initialized');
    }

    try {
      const sourceCode = String(code ?? "");

      if (/\binput\s*\(/.test(sourceCode)) {
        pyodide.globals.set("__user_code_source__", sourceCode);
        await pyodide.runPythonAsync(`
import ast
from pyodide.code import eval_code_async

class _ConsoleInputTransformer(ast.NodeTransformer):
    def visit_FunctionDef(self, node):
        return node

    def visit_ClassDef(self, node):
        return node

    def visit_Lambda(self, node):
        return node

    def visit_Call(self, node):
        self.generic_visit(node)
        if isinstance(node.func, ast.Name) and node.func.id == "input":
            return ast.copy_location(
                ast.Await(
                    value=ast.Call(
                        func=ast.Name(id="__console_input__", ctx=ast.Load()),
                        args=node.args,
                        keywords=node.keywords,
                    )
                ),
                node,
            )
        return node

_console_input_tree = ast.parse(__user_code_source__, mode="exec")
_console_input_tree = _ConsoleInputTransformer().visit(_console_input_tree)
ast.fix_missing_locations(_console_input_tree)

await eval_code_async(ast.unparse(_console_input_tree), globals=globals())
        `);
      } else {
        await pyodide.runPythonAsync(sourceCode);
      }
      return null; // No error
    } catch (err) {
      return extractUserRelevantPythonError(err);
    }
  },

  analyzeDefinitions: async (code) => {
    try {
      const definitions = await fetchJediDefinitions(code);
      return JSON.stringify(definitions);
    } catch (error) {
      console.error('Definition analysis error:', error);
      return JSON.stringify([]);
    }
  },

  installPackages: async (packages) => {
    if (!pyodide || !pyodideReady) {
      return {
        success: false,
        error: 'Pyodide not initialized',
        installed: []
      };
    }

    if (!packages || packages.length === 0) {
      return {
        success: true,
        error: null,
        installed: []
      };
    }

    const installed = [];
    const errors = [];

    try {
      // Get micropip
      const micropip = pyodide.pyimport('micropip');

      for (const package of packages) {
        try {
          console.log(`Installing package: ${package}`);
          await micropip.install(package);
          installed.push(package);
          console.log(`Successfully installed: ${package}`);
        } catch (pkgError) {
          console.error(`Failed to install ${package}:`, pkgError);
          errors.push(`${package}: ${pkgError.message || pkgError}`);
        }
      }

      return {
        success: errors.length === 0,
        error: errors.length > 0 ? errors.join('; ') : null,
        installed: installed
      };
    } catch (error) {
      console.error('Package installation error:', error);
      return {
        success: false,
        error: error.message || error.toString(),
        installed: installed
      };
    }
  }
};

// Additional mobile keyboard prevention
window.disableSystemKeyboard = function() {
  // Only disable if virtual keyboard is enabled
  if (!isVirtualKeyboardEnabled) return;
  
  // Disable system keyboard globally on mobile
  document.addEventListener('touchstart', function(e) {
    if (isVirtualKeyboardEnabled && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) {
      e.target.setAttribute('readonly', 'readonly');
      e.target.setAttribute('inputmode', 'none');
    }
  });
  
  // Prevent zoom on input focus (mobile Safari)
  document.addEventListener('touchend', function(e) {
    if (isVirtualKeyboardEnabled && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) {
      e.target.blur();
    }
  });
};

// Auto-disable on mobile devices - now called conditionally from Flutter
// if (isMobileDevice) {
//   window.disableSystemKeyboard();
// }

console.log('monacoInterop object created:', window.monacoInterop);
console.log('pyodideInterop object created:', window.pyodideInterop);
