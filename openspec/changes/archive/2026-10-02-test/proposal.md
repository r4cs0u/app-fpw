# Proposal

## Why

The current userscript has a working automation flow, but it is still tightly coupled to the WebPonto DOM and to a production-oriented structure that is hard to evolve safely. This change creates a controlled experimental line to validate a cleaner architecture, a new product identity, and a safer testing workflow without disturbing the stable base currently in use.

## What Changes

- Create a separate experimental branch for testing the next generation of the app.
- Keep the experimental userscript clearly labeled as the test branch without redefining the name of the main product.
- Keep the existing production flow as a stable reference while the test line evolves.
- Separate the project documentation into page structure, agent guardrails, and roadmap tracking.
- Prepare the architecture for a safer remodularization focused on domain, execution, and UI separation.

## Capabilities

### New Capabilities
- `fpw-automation`: establishes a controlled experimental automation line for the WebPonto workflow, with clear separation between the stable production setup and the new test environment.
- `test-branch-branding`: defines the identification of the experimental branch without redefining the stable name of the application.

### Modified Capabilities
- None.

## Impact

- Production userscript remains as the stable reference line.
- Experimental project gains a dedicated environment for validation and remodularization.
- Documentation becomes clearer and more maintainable through dedicated guidance for page structure and agent behavior.
- Future architecture work will be isolated from the active production workflow until the experimental line is validated.
