import { describe, expect, it } from 'vitest';

import {
  addToCache,
  contentCache,
  createPlugins,
  fixMarkdownBold,
  preprocessContent,
  transformCitations,
} from '../src/hooks/useMarkdown/utils';

describe('useMarkdown utils', () => {
  describe('cache functions', () => {
    it('should add and retrieve from cache', () => {
      contentCache.clear(); // Reset cache before test
      addToCache('key1', 'value1');
      expect(contentCache.get('key1')).toBe('value1');
    });

    it('should remove oldest entry when cache size limit reached', () => {
      contentCache.clear(); // Reset cache before test

      // Fill cache to limit
      for (let i = 0; i < 50; i++) {
        addToCache(`key${i}`, `value${i}`);
      }

      // Add one more
      addToCache('newKey', 'newValue');

      // Check oldest was removed
      expect(contentCache.get('key0')).toBeUndefined();
      expect(contentCache.get('newKey')).toBe('newValue');
      expect(contentCache.size).toBe(50);
    });
  });

  describe('createPlugins', () => {
    it('should create plugin lists based on options', () => {
      const plugins = createPlugins({
        allowHtml: true,
        animated: true,
        enableCustomFootnotes: true,
        enableLatex: true,
        isChatMode: true,
      });

      expect(plugins.rehypePluginsList.length).toBe(5);
      expect(plugins.remarkPluginsList.length).toBe(4);
    });

    it('should handle empty plugin options', () => {
      const plugins = createPlugins({
        isChatMode: false,
      });

      expect(plugins.rehypePluginsList).toEqual([]);
      expect(plugins.remarkPluginsList).toEqual([[expect.any(Function), { singleTilde: false }]]);
    });
  });

  describe('fixMarkdownBold', () => {
    it('should fix bold syntax after symbols', () => {
      expect(fixMarkdownBold('Hello,**bold** text')).toBe('Hello,**bold** text');
      expect(fixMarkdownBold('Hello.**bold** text')).toBe('Hello.**bold** text');
      expect(fixMarkdownBold('Hello!**bold** text')).toBe('Hello!**bold** text');
    });

    it('should handle code blocks correctly', () => {
      expect(fixMarkdownBold('```**bold**```')).toBe('```**bold**```');
      expect(fixMarkdownBold('`**bold**`')).toBe('`**bold**`');
      expect(fixMarkdownBold('```\n**bold**\n```')).toBe('```\n**bold**\n```');
    });

    it('should handle multiple asterisks', () => {
      expect(fixMarkdownBold('***bold***')).toBe('***bold***');
      expect(fixMarkdownBold('****bold****')).toBe('****bold****');
    });

    it('should not add space when not needed', () => {
      expect(fixMarkdownBold('**bold** text')).toBe('**bold** text');
      expect(fixMarkdownBold('text **bold**')).toBe('text **bold**');
    });

    it('should handle mixed code and bold', () => {
      expect(fixMarkdownBold('```code``` **bold** `inline` **end**')).toBe(
        '```code``` **bold** `inline` **end**',
      );
    });
  });

  describe('transformCitations', () => {
    it('should transform citation references', () => {
      const input = 'Text with citation [1] and [2]';
      const expected = 'Text with citation [#citation-1](citation-1) and [#citation-2](citation-2)';
      expect(transformCitations(input, 2)).toBe(expected);
    });

    it('should not transform citations in code blocks', () => {
      const input = '```[1]``` and [2]';
      const expected = '```[1]``` and [#citation-2](citation-2)';
      expect(transformCitations(input, 2)).toBe(expected);
    });

    it('should not transform citations in LaTeX blocks', () => {
      const input = '$[1]$ and [2] and $$[3]$$ and [4]';
      const expected =
        '$[1]$ and [#citation-2](citation-2) and $$[3]$$ and [#citation-4](citation-4)';
      expect(transformCitations(input, 4)).toBe(expected);
    });

    it('should handle consecutive citations', () => {
      const input = '[1][2]';
      const expected = '[#citation-1](citation-1)[#citation-2](citation-2)';
      expect(transformCitations(input, 2)).toBe(expected);
    });

    it('should return original content when no citations length provided', () => {
      const input = 'Text with [1] and [2]';
      expect(transformCitations(input)).toBe(input);
      expect(transformCitations(input, 0)).toBe(input);
    });

    it('should handle citations in inline code', () => {
      const input = '`[1]` and [2] and `code with [3]` and [4]';
      const expected =
        '`[1]` and [#citation-2](citation-2) and `code with [3]` and [#citation-4](citation-4)';
      expect(transformCitations(input, 4)).toBe(expected);
    });
  });

  describe('preprocessContent', () => {
    it('should process content with all options enabled', () => {
      const input = 'LaTeX: $x^2$ and citation [1]';
      const output = preprocessContent(input, {
        citationsLength: 1,
        enableCustomFootnotes: true,
        enableLatex: true,
      });
      expect(output).toContain('$x^2$');
      expect(output).toContain('[#citation-1](citation-1)');
    });

    it('should skip processing when options disabled', () => {
      const input = 'LaTeX: $x^2$ and citation [1]';
      const output = preprocessContent(input);
      expect(output).toBe(input);
    });

    it('should handle empty content', () => {
      expect(preprocessContent('')).toBe('');
      expect(preprocessContent('', { enableLatex: true })).toBe('');
    });

    it('should handle content with mixed elements', () => {
      const input = '```code``` $math$ [1] **bold**';
      const output = preprocessContent(input, {
        citationsLength: 1,
        enableCustomFootnotes: true,
        enableLatex: true,
      });
      expect(output).toContain('```code```');
      expect(output).toContain('$math$');
      expect(output).toContain('[#citation-1](citation-1)');
      expect(output).toContain('**bold**');
    });
  });
});
