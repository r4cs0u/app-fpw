# Spec Delta

## ADDED Requirements

### Requirement: Folga classification uses the associated date heading
The system SHALL classify a mapped schedule entry as a folga only from the day heading associated with that entry's own date. Text from another row or an enclosing table section SHALL NOT classify the entry as a folga.

#### Scenario: A grouped table contains unrelated folga text
- **WHEN** the page groups a non-folga heading for 03/10/2026 and a separate row containing the word “Folga” in the same table section
- **THEN** the entry mapped to 03/10/2026 SHALL NOT be classified as a folga based on that separate row

#### Scenario: A folga heading remains detectable in the same weekly group
- **WHEN** the heading associated with 04/10/2026 identifies that date as a folga
- **THEN** the entry mapped to 04/10/2026 SHALL be classified as a folga independently of text associated with 03/10/2026
