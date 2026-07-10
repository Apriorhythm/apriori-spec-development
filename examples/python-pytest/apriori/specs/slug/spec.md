### Requirement: slugify normalizes text into URL-safe slugs
`slugify` SHALL lowercase its input, collapse every non-alphanumeric run into a single hyphen, and trim leading/trailing hyphens.

#### Scenario: PY-01 lowercases and hyphenates
- WHEN slugify('Hello World') is called
- THEN it returns 'hello-world'

#### Scenario: PY-02 collapses runs and trims edges
- WHEN slugify('  --Big__Deal!! ') is called
- THEN it returns 'big-deal'

#### Scenario: PY-03 empty and symbol-only input yields the empty slug
- WHEN slugify('***') is called
- THEN it returns ''
