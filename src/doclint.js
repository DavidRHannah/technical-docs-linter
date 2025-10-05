#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import { fileURLToPath } from 'url';

// ESM dirname setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default configuration
const defaultConfig = {
  rules: {
    headingCase: {
      level: 'warning',
      message: 'Heading should be in sentence case.',
      args: {}
    },
    minimumWordsInSentence: {
      level: 'warning',
      message: 'Sentence may contain too few words',
      args: { min: 10 }
    },
    maxWordsInSentence: {
      level: 'error',
      message: 'Too many words in sentence.',
      args: { limit: 25 }
    },
    maxSentencesInParagraph: {
      level: 'error',
      message: 'Too many sentences in paragraph.',
      args: { limit: 5 }
    },
    bannedPhrases: {
      level: 'error',
      message: 'Banned phrase identified.',
      args: {
        phrases: ['are used to', 'has been', 'has finished', 'if you want to']
      }
    }
  },
  format: 'text'
};

// Helper functions
function extractText(node) {
  let text = '';
  visit(node, 'text', (textNode) => {
    text += textNode.value;
  });
  return text;
}

function isSentenceCase(text) {
  if (!text || text.length === 0) return true;
  if (text[0] !== text[0].toUpperCase()) return false;
  const words = text.split(/\s+/);
  if (words.length <= 1) return true;
  let capitalizedCount = 0;
  for (let i = 1; i < words.length; i++) {
    if (words[i].length > 0 && words[i][0] === words[i][0].toUpperCase()) {
      capitalizedCount++;
    }
  }
  return capitalizedCount < words.length / 2;
}

function splitIntoSentences(text) {
  return text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
}

function countWords(text) {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

// Rule implementations
const rules = {
  headingCase: (node, config) => {
    const issues = [];
    visit(node, 'heading', (headingNode) => {
      const text = extractText(headingNode);
      if (!isSentenceCase(text)) {
        issues.push({
          line: headingNode.position?.start.line || 0,
          rule: 'heading-case',
          severity: config.level,
          message: config.message
        });
      }
    });
    return issues;
  },

  minimumWordsInSentence: (node, config) => {
    const issues = [];
    const minWords = config.args.min || 10;
    visit(node, 'paragraph', (paragraphNode) => {
      const text = extractText(paragraphNode);
      const sentences = splitIntoSentences(text);
      for (const sentence of sentences) {
        const wordCount = countWords(sentence);
        if (wordCount > 0 && wordCount < minWords) {
          issues.push({
            line: paragraphNode.position?.start.line || 0,
            rule: 'minimum-words-in-sentence',
            severity: config.level,
            message: config.message
          });
        }
      }
    });
    return issues;
  },

  maxWordsInSentence: (node, config) => {
    const issues = [];
    const limit = config.args.limit || 25;
    visit(node, 'paragraph', (paragraphNode) => {
      const text = extractText(paragraphNode);
      const sentences = splitIntoSentences(text);
      for (const sentence of sentences) {
        const wordCount = countWords(sentence);
        if (wordCount > limit) {
          issues.push({
            line: paragraphNode.position?.start.line || 0,
            rule: 'max-words-in-sentence',
            severity: config.level,
            message: config.message
          });
        }
      }
    });
    return issues;
  },

  maxSentencesInParagraph: (node, config) => {
    const issues = [];
    const limit = config.args.limit || 5;
    visit(node, 'paragraph', (paragraphNode) => {
      const text = extractText(paragraphNode);
      const sentences = splitIntoSentences(text);
      if (sentences.length > limit) {
        issues.push({
          line: paragraphNode.position?.start.line || 0,
          rule: 'max-sentences-in-paragraph',
          severity: config.level,
          message: config.message
        });
      }
    });
    return issues;
  },

  bannedPhrases: (node, config) => {
    const issues = [];
    const phrases = config.args.phrases || [];
    visit(node, ['paragraph', 'heading'], (textNode) => {
      const text = extractText(textNode).toLowerCase();
      for (const phrase of phrases) {
        if (text.includes(phrase.toLowerCase())) {
          issues.push({
            line: textNode.position?.start.line || 0,
            rule: 'banned-phrases',
            severity: config.level,
            message: config.message
          });
        }
      }
    });
    return issues;
  }
};

// Load configuration
function loadConfig(configPath) {
  if (configPath && fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error(chalk.red(`Error loading config file: ${error.message}`));
      process.exit(1);
    }
  }

  const defaultConfigPath = path.join(process.cwd(), '.doclint.json');
  if (fs.existsSync(defaultConfigPath)) {
    try {
      return JSON.parse(fs.readFileSync(defaultConfigPath, 'utf8'));
    } catch (error) {
      console.error(chalk.red(`Error loading .doclint.json: ${error.message}`));
      process.exit(1);
    }
  }

  return defaultConfig;
}

function parseMarkdown(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const processor = unified().use(remarkParse);
    return processor.parse(content);
  } catch (error) {
    console.error(chalk.red(`Error reading file: ${error.message}`));
    process.exit(1);
  }
}

function lintFile(filePath, config) {
  const ast = parseMarkdown(filePath);
  const allIssues = [];
  for (const [ruleName, ruleConfig] of Object.entries(config.rules)) {
    if (rules[ruleName]) {
      allIssues.push(...rules[ruleName](ast, ruleConfig));
    }
  }
  allIssues.sort((a, b) => a.line - b.line);
  return allIssues;
}

function formatOutput(filePath, issues, format) {
  const fileName = path.basename(filePath);
  if (format === 'text') {
    return issues
      .map(
        issue =>
          `${fileName}:${issue.line}: ${issue.message} [${issue.rule}] [${issue.severity}]`
      )
      .join('\n');
  }
  return issues;
}

function writeOutput(output, outputPath, format) {
  try {
    if (format === 'text') {
      fs.writeFileSync(outputPath, output, 'utf8');
    } else {
      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
    }
    console.log(chalk.green(`Output written to ${outputPath}`));
  } catch (error) {
    console.error(chalk.red(`Error writing output: ${error.message}`));
    process.exit(1);
  }
}

// CLI setup
const argv = yargs(hideBin(process.argv))
  .command('lint <file>', 'Lint a markdown file', (yargs) =>
    yargs
      .positional('file', { describe: 'Path to markdown file', type: 'string' })
      .option('o', { alias: 'output', describe: 'Output file path', type: 'string' })
      .option('config', { describe: 'Path to config file', type: 'string' })
  )
  .demandCommand(1, 'You need to specify a command')
  .help()
  .parse();

if (argv._[0] === 'lint') {
  const filePath = argv.file;
  const outputPath = argv.output;
  const configPath = argv.config;

  if (!fs.existsSync(filePath)) {
    console.error(chalk.red(`File not found: ${filePath}`));
    process.exit(1);
  }

  const config = loadConfig(configPath);
  const issues = lintFile(filePath, config);
  const output = formatOutput(filePath, issues, config.format);

  if (outputPath) writeOutput(output, outputPath, config.format);
  else console.log(config.format === 'text' ? output : JSON.stringify(output, null, 2));

  const hasErrors = issues.some(issue => issue.severity === 'error');
  process.exit(hasErrors ? 1 : 0);
}
