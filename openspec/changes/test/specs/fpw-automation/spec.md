# Spec Delta

## ADDED Requirements

### Requirement: Controlled experimental FPW automation line
The system shall support a dedicated experimental automation line that allows the team to test remodularization and product-brand changes without disrupting the stable production userscript.

#### Scenario: project separation for safe experimentation
- **WHEN** the team starts a new experimental iteration of the FPW automation
- **THEN** the project shall keep the current production setup isolated as the stable baseline
- **AND** the experimental line shall be versioned and documented as a separate test environment

#### Scenario: test branch identity
- **WHEN** the experimental line is versioned in the test branch
- **THEN** the userscript metadata and documentation shall clearly mark it as a test build
- **AND** the stable project shall remain identifiable as the original production reference line without redefining its official name

### Requirement: Structured knowledge for automation
The system shall maintain dedicated documentation that distinguishes the structure of the target page from the operational rules for automation and agent behavior.

#### Scenario: page structure is documented independently
- **WHEN** the project needs to understand the WebPonto DOM and workflow
- **THEN** the page structure documentation shall describe the available frames, selectors, and interaction constraints
- **AND** it shall not mix operational behavior rules with technical page mapping

#### Scenario: automation guardrails are documented independently
- **WHEN** an automated agent or userscript needs to act on the page
- **THEN** the agent guide shall define safe operating limits, stop conditions, and supervision expectations
- **AND** the guide shall remain distinct from the page structure contract
