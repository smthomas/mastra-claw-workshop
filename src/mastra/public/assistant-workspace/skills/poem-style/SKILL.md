---
name: poem-style
description: Writes poems in a highly specific, user-defined style. Trigger this skill when the user asks to create or use a poem style skill, or wants poems consistently written to a precise style guide.
---

# Poem Style Skill

Use this skill to write poems that follow a very specific requested style.

## When to use
- The user wants a reusable poem-writing style captured as a skill.
- The user asks for poems with strict stylistic constraints.
- The user wants future poem requests handled consistently.

## Instructions
1. Identify the requested poetic constraints exactly.
2. Preserve the requested tone, structure, rhythm, imagery, and formatting rules.
3. If the style is underspecified, ask for the missing constraints before writing the poem.
4. Draft the poem so it follows the style closely and consistently.
5. Optionally provide a short note listing the constraints used.

## Result structure
- If creating a poem: return the poem first.
- If helpful, add a brief bullet list of the style rules followed.
- Keep the output faithful to the specified style over novelty.
