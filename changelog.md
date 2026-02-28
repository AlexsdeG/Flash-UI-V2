
# Changelog

All notable changes to the FlashUI project will be documented in this file.

## [0.0.4] - 2026-02-28
### Added
- Image reference upload support for new projects and designs.
- Ability to attach multiple images to prompts.
- UI for managing attached images (preview and remove).

## [0.0.3] - 2026-02-28
### Added
- AI-generated project titles based on user prompts.
- Project tab renaming functionality with inline editing.
- Truncated tab titles with tooltips for full names.
- Pen icon on hover for easier renaming access.

## [0.0.2] - 2026-02-28
### Added
- Centralized model configuration in `config/models.ts`.
- Dynamic model selection dropdown in `InputDeck`.
- `DEFAULT_MODEL` constant to ensure consistency across the app.

### Changed
- Replaced hardcoded "gemini-2.5-flash" strings with `DEFAULT_MODEL`.
- Updated `store.ts` and `service.ts` to use the new configuration.

## [0.0.1] - 2026-02-28
### Added
- Import project functionality in `InputDeck`.
- "Download Code" button for individual variants.
- `jszip` and `file-saver` dependencies.

### Changed
- Moved import functionality from Dashboard header to InputDeck.
- Refactored `Dashboard.tsx` to remove unused import logic.

## [0.0.3] - 2024-05-24

### Added
- **AI Service Layer**: Full integration with Google Gemini API for real code generation.
- **Global Settings**: Modal to manage API Keys (Gemini, OpenRouter) and custom models.
- **Variant Forking**: Ability to fork an existing design with specific modification instructions.
- **Full Build**: Context menu action to expand a prototype into a production-ready architecture.
- **History System**: Save checkpoints and history tracking for variants.
- **Editor Save**: Manual save button in code editor that creates history snapshots.

### Changed
- **Generation Logic**: Replaced mock timeout generation with real AI service calls.
- **Dashboard Creation**: "Create New Design" now uses the AI service.

## [0.0.2] - 2024-05-23

### Added
- **Variant Families**: Editor sidebar now isolates variants per root design, preventing clutter.
- **Advanced Configuration**: Per-style-card configuration modal in Input Deck.
- **Color Picker**: Added brand color selection to project settings.
- **Custom App Types**: Added input for custom application types.
- **Dashboard Renaming**: Click-to-edit project titles in the dashboard.
- **Editor Actions**: Added "Create Full Page" and "Fork Variant" to context menus.

### Changed
- **Dashboard Layout**: Switched from horizontal scroll to a responsive vertical grid.
- **Desktop Preview**: Removed device chrome/padding for desktop mode to maximize screen real estate.
- **Model Selector**: Moved to a more accessible location in the Input Deck.
- **Card Visuals**: Removed white borders and improved preview scaling in Artifact Cards.

## [0.0.1] - 2024-05-23

### Added
- **Dashboard Separation**: Clear distinction between "New Project/Input" mode and "Project Overview/Grid" mode.
- **Enhanced Settings**: Added rich configuration options for new projects (App Type, Framework, Theme).
- **Style Stack Improvements**: Added "Randomize Style" button and expanded style options.
- **Artifact Card Visuals**: Restored the "streaming code" visual effect for cards in generation state.
- **Editor Sidebar Menu**: Context menu for Variants to Rename and Delete them.
- **Project Tabs**: Persistent project tabs across the application.
- **Changelog**: Initialized changelog file.

### Changed
- **Navigation Flow**: Generating variants now correctly redirects to the Dashboard Grid view instead of staying on Input.
- **Back Navigation**: "Back to Dashboard" from Editor now preserves the Grid view if variants exist.
- **Data Model**: Updated `Project` and `Variant` types to support `GenerationSettings`.
- **UI Polish**: Improved spacing and transitions in the Dashboard and Input Deck.

### Fixed
- Fixed issue where generating would not switch view mode.
- Fixed issue where going back to dashboard reset to input mode even with existing designs.
- Fixed type errors regarding `Artifact` vs `Variant` in legacy components.
