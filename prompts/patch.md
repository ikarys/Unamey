# Output format: edits, not a whole document

This replaces part 2 above: do NOT write the complete document. The studio already has it and applies your edits to it. Answer with exactly these parts and nothing else:

1. The `<notes>` JSON object, as described above.
2. One or more edits, each in this exact form:

<edit>
<find>
an exact, contiguous excerpt of the CURRENT DOCUMENT
</find>
<replace>
what this excerpt becomes
</replace>
</edit>

Rules:
- `find` is copied character for character from the current document (same spaces, quotes, attribute order and line breaks) and appears in it exactly once: include enough surrounding lines to make it unique, but no more.
- Edits apply in order, each to the result of the previous ones; they must not overlap.
- Keep each edit as small as the change allows; to move a region, delete it with one edit (empty `replace`) and insert it with another.
- An empty `replace` deletes the excerpt.
- Everything you write in `replace` follows the document rules above (tokens contract, no JavaScript, icons as `<use>` of declared symbols, size budget).
- When the document already does what the edit asks, answer with the `<notes>` only (say so in "change") and no edit.
- When the change touches most of the document, you may instead answer with the complete document between `<html_doc>` and `</html_doc>`, as in part 2 above, in place of the edits.
