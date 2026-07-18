import os

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        if '<<<<<<< HEAD' not in content:
            return
            
        lines = content.split('\n')
        new_lines = []
        state = 'NORMAL'
        fixed = False
        
        for line in lines:
            if line.startswith('<<<<<<< HEAD'):
                state = 'IN_HEAD'
                fixed = True
                continue
            if line.startswith('======='):
                if state == 'IN_HEAD':
                    state = 'IN_REMOTE'
                    continue
            if line.startswith('>>>>>>>'):
                if state == 'IN_REMOTE' or state == 'IN_HEAD':
                    state = 'NORMAL'
                    continue
                    
            if state == 'NORMAL' or state == 'IN_HEAD':
                new_lines.append(line)
                
        if fixed:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write('\n'.join(new_lines))
            print(f"Fixed {filepath}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

def walk(directory):
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.git' in dirs:
            dirs.remove('.git')
        if '.next' in dirs:
            dirs.remove('.next')
            
        for file in files:
            if file == 'package-lock.json':
                continue
            filepath = os.path.join(root, file)
            process_file(filepath)

walk('.')
