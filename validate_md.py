with open('test_large.md', encoding='utf-8') as f:
    content = f.read()
lines = content.split('\n')
fence = '```'
h1 = sum(1 for l in lines if l.startswith('# '))
h2 = sum(1 for l in lines if l.startswith('## '))
h3 = sum(1 for l in lines if l.startswith('### '))
code = sum(1 for l in lines if l.startswith(fence))
table = sum(1 for l in lines if l.startswith('|'))
quote = sum(1 for l in lines if l.startswith('> '))
bold = sum(1 for l in lines if '**' in l)
print(f'Total lines: {len(lines)}')
print(f'File size: {len(content)/1024:.1f} KB')
print(f'H1 headers: {h1}')
print(f'H2 headers: {h2}')
print(f'H3 headers: {h3}')
print(f'Code fences: {code}')
print(f'Table rows: {table}')
print(f'Blockquotes: {quote}')
print(f'Bold text lines: {bold}')
# Validate code fences are balanced
assert code % 2 == 0, f'Unbalanced code fences: {code}'
print('Code fences: BALANCED')
print('Validation PASSED')
