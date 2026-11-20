//! Search/replace edits returned by the model instead of a whole document.

#[derive(Debug)]
pub struct Edit {
    pub find: String,
    pub replace: String,
}

/// All `<edit><find>…</find><replace>…</replace></edit>` blocks, in order. Strip exactly one leading and one trailing newline
/// inside `<find>` and `<replace>` (the prompt puts the tags on their own lines), nothing else (whitespace is significant).
/// An unclosed block (answer cut by the output limit) is an error: applying only the first edits would half-apply the change.
pub fn parse(text: &str) -> Result<Vec<Edit>, String> {
    let mut edits = Vec::new();
    let mut pos = 0;

    while let Some(offset) = text[pos..].find("<edit>") {
        let edit_start = pos + offset;
        let after_edit = edit_start + "<edit>".len();

        let find_start = match text[after_edit..].find("<find>") {
            Some(x) => after_edit + x,
            None => return Err(format!("edit {}: incomplete block", edits.len() + 1)),
        };
        let find_end = match text[find_start + "<find>".len()..].find("</find>") {
            Some(x) => find_start + "<find>".len() + x,
            None => return Err(format!("edit {}: incomplete block", edits.len() + 1)),
        };
        let replace_start = match text[find_end + "</find>".len()..].find("<replace>") {
            Some(x) => find_end + "</find>".len() + x,
            None => return Err(format!("edit {}: incomplete block", edits.len() + 1)),
        };
        let replace_end = match text[replace_start + "<replace>".len()..].find("</replace>") {
            Some(x) => replace_start + "<replace>".len() + x,
            None => return Err(format!("edit {}: incomplete block", edits.len() + 1)),
        };
        let edit_end = match text[replace_end + "</replace>".len()..].find("</edit>") {
            Some(x) => replace_end + "</replace>".len() + x,
            None => return Err(format!("edit {}: incomplete block", edits.len() + 1)),
        };

        let find = strip_one_newline(&text[find_start + "<find>".len()..find_end]);
        let replace = strip_one_newline(&text[replace_start + "<replace>".len()..replace_end]);
        edits.push(Edit { find: find.to_string(), replace: replace.to_string() });

        pos = edit_end + "</edit>".len();
    }

    Ok(edits)
}

/// Applies edits in order, each to the result of the previous. Each `find` must be non-empty and occur exactly once
/// in the current text, otherwise Err naming the edit index (1-based) and "not found" or "found N times".
pub fn apply(html: &str, edits: &[Edit]) -> Result<String, String> {
    let mut text = html.to_string();

    for (idx, edit) in edits.iter().enumerate() {
        let i = idx + 1;
        if edit.find.is_empty() {
            return Err(format!("edit {i}: not found"));
        }

        let count = text.matches(&edit.find).count();
        if count == 1 {
            let pos = text.find(&edit.find).unwrap();
            text.replace_range(pos..pos + edit.find.len(), &edit.replace);
            continue;
        }
        if count > 1 {
            return Err(format!("edit {i}: found {count} times"));
        }

        let (tolerant_count, span) = tolerant_match(&text, &edit.find);
        match span {
            Some((start, end)) if tolerant_count == 1 => {
                text.replace_range(start..end, &edit.replace);
            }
            Some(_) => return Err(format!("edit {i}: found {tolerant_count} times")),
            None => return Err(format!("edit {i}: not found")),
        }
    }

    Ok(text)
}

fn strip_one_newline(s: &str) -> &str {
    let s = s.strip_prefix('\n').unwrap_or(s);
    s.strip_suffix('\n').unwrap_or(s)
}

/// Match `find` against `text` ignoring trailing whitespace at line ends.
/// Returns the number of matches and, when there is one, the original span to replace.
fn tolerant_match(text: &str, find: &str) -> (usize, Option<(usize, usize)>) {
    let find_lines: Vec<&str> = find.split_inclusive('\n').collect();
    let text_lines = line_info(text);

    if text_lines.len() < find_lines.len() {
        return (0, None);
    }

    let mut count = 0;
    let mut span = None;

    for i in 0..=text_lines.len() - find_lines.len() {
        let mut ok = true;
        for j in 0..find_lines.len() {
            let (start, content_end, _) = text_lines[i + j];
            if text[start..content_end].trim_end() != find_lines[j].trim_end() {
                ok = false;
                break;
            }
        }

        if ok {
            count += 1;
            if count == 1 {
                let last = i + find_lines.len() - 1;
                let end = if find_lines[last].ends_with('\n') { text_lines[last].2 } else { text_lines[last].1 };
                span = Some((text_lines[i].0, end));
            }
        }
    }

    (count, span)
}

/// Line spans as `(start, content_end, line_end)`. `content_end` excludes the newline; `line_end` includes it.
fn line_info(text: &str) -> Vec<(usize, usize, usize)> {
    let mut lines = Vec::new();
    let mut start = 0;

    for (i, _) in text.match_indices('\n') {
        lines.push((start, i, i + 1));
        start = i + 1;
    }

    if start < text.len() {
        lines.push((start, text.len(), text.len()));
    }

    lines
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_two_blocks_with_surrounding_prose() {
        let text = "before\n<edit>\n<find>\nA\n</find>\n<replace>\nB\n</replace>\n</edit>\nmid\n<edit>\n<find>\nC\n</find>\n<replace>\n\n</replace>\n</edit>\nafter";
        let edits = parse(text).unwrap();

        assert_eq!(edits.len(), 2);
        assert_eq!(edits[0].find, "A");
        assert_eq!(edits[0].replace, "B");
        assert_eq!(edits[1].find, "C");
        assert_eq!(edits[1].replace, "");
    }

    #[test]
    fn parse_rejects_a_cut_block() {
        let text = "<edit>\n<find>\nA\n</find>\n<replace>\nB\n</replace>\n</edit>\n<edit>\n<find>\nC\n</find>\n<replace>\nhalf";
        assert_eq!(parse(text).unwrap_err(), "edit 2: incomplete block");
    }

    #[test]
    fn apply_sequential_edits() {
        let html = "a\nb\nc";
        let edits = vec![Edit { find: "a".into(), replace: "A".into() }, Edit { find: "b".into(), replace: "B".into() }];

        assert_eq!(apply(html, &edits).unwrap(), "A\nB\nc");
    }

    #[test]
    fn apply_delete_with_empty_replace() {
        let html = "a\nb";
        let edits = vec![Edit { find: "b".into(), replace: String::new() }];

        assert_eq!(apply(html, &edits).unwrap(), "a\n");
    }

    #[test]
    fn apply_missing_find() {
        let edits = vec![Edit { find: "x".into(), replace: "y".into() }];

        assert_eq!(apply("a", &edits).unwrap_err(), "edit 1: not found");
    }

    #[test]
    fn apply_duplicate_find() {
        let edits = vec![Edit { find: "a".into(), replace: "b".into() }];

        assert_eq!(apply("a a", &edits).unwrap_err(), "edit 1: found 2 times");
    }

    #[test]
    fn apply_tolerant_trailing_whitespace_match() {
        // The exact excerpt is absent (the document has trailing spaces after "a"); line-wise it matches once.
        let html = "a  \nb\nc";
        let edits = vec![Edit { find: "a\nb".into(), replace: "X".into() }];

        assert_eq!(apply(html, &edits).unwrap(), "X\nc");
    }
}
