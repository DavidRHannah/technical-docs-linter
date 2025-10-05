# Functional Specifications

## Technical Documentation Linter Overview

### Purpose
The technical documentation linter aims to provide configurable linting rulesets for your technical documentation.

#### Detects and Enforces:
- Style Consistency
- Grammar and Spelling
- Terminology Adherence
- Structural Best Practices
- Formatting Rules
- Custom Rules

#### Target Users:
- Technical writers
- Developers writing technical documentation

### In-Scope Features
- Command Line Interface
- Parse documentation files written in Markdown
- Rule-based analysis of grammar, style, terminology, and structure
- Configurable ruleset engine
- Output with warning, errors, and suggestions
- Enable/disable rules as needed
- Continuous Integration pipeline with GitHub Actions

### Supported Input Formats
- Markdown (``` .md ```)

### Supported Output Formats
- Plaintext (```.txt```) and JSON (```.json```) for linter reporting

## System Architecture
### High-Level Diagram
![High Level Diagram](/docs/diagrams/high-level-design/High_Level_Diagram.svg)

### Key Modules
- **File Parser**: Reads and parses input files.
- **Rule Engine**: Applies linter rules to parsed content.
- **Ruleset Registry**: Stores built-in and user-defined rules.
- **Reporter**: Outputs results to the CLI or a plaintext file
- **Rule Config Manager**: Parses `.doclint.json` config file.
- **CLI**: Entry point for user-command-line interaction.

## Features and Functional Requirements

### Command-Line Interface

|    Name   |                        Format                        | Purpose                  |
|:----------|:-----------------------------------------------------|:-------------------------|
| Lint      | `doclint lint path/to/file.md -o path/to/output.txt` | Generate linter report   |
| Configure | `doclint --config path/to/config.json`               | Configure linter ruleset |

### Rule Engine

#### Each rule has:
- Rule ID 
- Level (info, warning, error)
- Message
- Logic (regex or custom function)
- Suggestion (optional)

### Rule Categories

#### Style
- Sentence case
- Title case in headings
- Limit paragraph and sentence length
- Identify passive voice and banned phrases
- Identify past and future tenses

#### Structural
- Header and Footers
- Heading-to-Paragraph Ratios
- Paragraph-to-Sentence Ratios

#### Grammar
- Subject-verb agreement

#### Spelling
- Spellcheck against dictionary
- Spellcheck against custom dictionary

#### Custom
- User-defined regex or logic rules defined in `.doclint.json`

### Configuration

#### Example Config File

**Filename:** `.doclint.json`

```json
{
  "rules": {
    "headingCase": {
      "level": "warning",
      "message": "Heading should be in sentence case.",
      "args": {}
    },
    "minimumWordsInSentence": {
      "level": "warning",
      "message": "Sentence may contain too few words",
      "args": {
        "min": 10
      }
    },
    "maxWordsInSentence": {
      "level": "error",
      "message": "Too many words in sentence.",
      "args": {
        "limit": 25
      }
    },
    "maxSentencesInParagraph": {
      "level": "error",
      "message": "Too many sentences in paragraph.",
      "args": {
        "limit": 5
      }
    },
    "bannedPhrases": {
      "level": "error",
      "message": "Banned phrase identified.",
      "args": {
        "phrases": [
          "are used to",
          "has been",
          "has finished",
          "if you want to"
        ]
      }
    }
  },
  "format": "text"
}
```

### Output Format

#### Text Format Example
``` mono
file.md:12: Heading should be in sentence case. [heading-case] [warning]
file.md:34: Sentence may contain too few words. [minimum-words-in-sentence] [warning]
file.md:45: Banned phrase identified. [banned-phrases] [error]
file.md:67: Too many sentences in paragraph. [max-sentences-in-paragraph] [error]
```

#### JSON Format Example
``` json
{
  "file": "file.md",
  "reports": {
    {
      "file": "file.md",
      "line": 12,
      "rule": "heading-case",
      "severity": "warning",
      "message": "Heading should be in sentence case."
    },
    {
      "file": "file.md",
      "line": 34,
      "rule": "minimum-words-in-sentence",
      "severity": "warning",
      "message": "Sentence may contain too few words."
    },
    {
      "file": "file.md",
      "line": 45,
      "rule": "banned-phrases",
      "severity": "error",
      "message": "Banned phrase identified."
    },
    {
      "file": "file.md",
      "line": 67,
      "rule": "max-sentences-in-paragraph",
      "severity": "error",
      "message": "Too many sentences in paragraph."
    },
  }
}
```

### Implementation Details

#### Language

Node.js

#### Dependencies

| Library   | Purpose                                                           |
|:----------|:------------------------------------------------------------------|
| `unified` | Compile content to syntax trees and syntax trees to content       |
| `yargs`   | Help build interactive CLI tools by parsing args and generating UI|
| `chalk`   | Terminal string styling                                           |

### Quality Assurance

- Unit tests for rules
- Integration tests with full documents
- Performance tests for large documents
- Test cases for each supported input/output format

### Future Features
- AutoFix for simple issues
- GUI and/or web dashboard
- Live VSCode linting in editors as a plugin

## Development Phase Plan

### Phase 1: Minimum viable product
- CLI with file parsing
- Basic rules: heading case, banned phrases, max sentence length, etc.
- Config file support
- Text output file

### Phase 2: Expand ruleset
- Grammar and spelling rules
- JSON output
- Continuous integration pipeline

### Phase 3: Allow customization
- User-defined rules
- Rule disabling with inline comments
