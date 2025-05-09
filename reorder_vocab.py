import json

def extract_index(item_id):
    # Extract the lesson number and item number from the ID
    parts = item_id.split('-')
    if len(parts) != 2:
        return (0, 0)
    
    lesson_part = parts[0]
    item_num = int(parts[1])
    
    # Extract lesson number from ww4l6 format
    lesson_num = int(lesson_part[4:]) if lesson_part.startswith('ww4l') else 0
    
    return (lesson_num, item_num)

# Read the vocabulary file
with open('vocabulary.json', 'r') as f:
    data = json.load(f)

# Sort the vocabulary items
data['vocabulary'].sort(key=lambda x: extract_index(x['id']))

# Write the sorted data back to the file
with open('vocabulary.json', 'w') as f:
    json.dump(data, f, indent=4)

print("Vocabulary has been reordered by index numbers.") 