#!/usr/bin/env python3
"""Validate Markdown file structure: headers, code fences, table rows, etc.

Usage: python validate_md.py <markdown_file>
"""

import re
import sys
from pathlib import Path

FENCE_PATTERN = re.compile(r'^[ \t]*(`{3,}|~{3,})(.*)$')


def count_fence_lines(lines: list[str]) -> int:
    """Count lines that are fenced code block markers (``` or ~~~)."""
    return sum(1 for l in lines if FENCE_PATTERN.match(l))


def check_fences_balanced(lines: list[str]) -> list[str]:
    """Check that all fenced code blocks are properly closed.

    Returns a list of error messages; empty if balanced.
    """
    errors: list[str] = []
    stack: list[tuple[int, str, str]] = []
    for i, line in enumerate(lines, 1):
        m = FENCE_PATTERN.match(line)
        if not m:
            continue
        marker = m.group(1)
        fence_type = marker[0]
        fence_len = len(marker)

        if not stack:
            stack.append((i, fence_type, marker))
        else:
            open_line, open_type, open_marker = stack[-1]
            if fence_type == open_type and fence_len >= len(open_marker):
                stack.pop()
            elif fence_type != open_type:
                errors.append(
                    f"Line {i}: closing fence '{marker}' (tilde) does not "
                    f"match opening fence '{open_marker}' (backtick) at line {open_line}"
                )
                stack.pop()
            else:
                stack.append((i, fence_type, marker))

    for open_line, open_type, open_marker in stack:
        fence_name = 'backtick' if open_type == '`' else 'tilde'
        errors.append(
            f"Line {open_line}: unclosed {fence_name} fence '{open_marker}'"
        )
    return errors


def analyze_file(filepath: str) -> None:
    path = Path(filepath)
    if not path.is_file():
        print(f'ERROR: File not found: {filepath}')
        sys.exit(1)

    content = path.read_text(encoding='utf-8')
    lines = content.split('\n')

    h1 = sum(1 for l in lines if l.startswith('# '))
    h2 = sum(1 for l in lines if l.startswith('## '))
    h3 = sum(1 for l in lines if l.startswith('### '))
    code = count_fence_lines(lines)
    table = sum(1 for l in lines if l.startswith('|'))
    quote = sum(1 for l in lines if l.startswith('> '))
    bold = sum(1 for l in lines if '**' in l)

    print(f'File: {filepath}')
    print(f'Total lines: {len(lines)}')
    print(f'File size: {len(content)/1024:.1f} KB')
    print(f'H1 headers: {h1}')
    print(f'H2 headers: {h2}')
    print(f'H3 headers: {h3}')
    print(f'Code fence markers: {code}')
    print(f'Table rows: {table}')
    print(f'Blockquotes: {quote}')
    print(f'Bold text lines: {bold}')

    fence_errors = check_fences_balanced(lines)
    if fence_errors:
        print('\nCode fence errors:')
        for err in fence_errors:
            print(f'  {err}')
        print('Code fences: UNBALANCED')
        print('Validation FAILED')
        sys.exit(1)
    else:
        print('Code fences: BALANCED')
        print('Validation PASSED')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python validate_md.py <markdown_file>')
        sys.exit(1)
    analyze_file(sys.argv[1])
