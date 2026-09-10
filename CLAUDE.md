# Music Player — Project Instructions

## Project

A personal, curated music player web application.

The primary goal is to take an art-directed Figma design and turn it into a polished, functional, publicly hosted web experience.

This is a design-to-code project rather than a commercial streaming platform.

## Design Source of Truth

The Figma design is the primary source of truth for visual design and interaction intent.

Prioritize visual fidelity over conventional implementation patterns.

Do not redesign existing UI without a clear functional reason.

## User

The primary user is the creator of this project.

The creator is an experienced brand/UI designer but an inexperienced developer.

Prefer making reasonable technical decisions independently.

Only ask for input when a decision materially affects product behavior, visual design, architecture, or scope.

Avoid unnecessary technical explanations.

## Product

The application contains approximately 12 curated albums.

Primary experience:

Library
→ browse albums
→ select album
→ album-focused state
→ tracklist
→ playback

## Audio

Initial audio should use static/local MP3 assets where practical.

Avoid external streaming APIs unless technically necessary.

## Architecture

Album and track information should be data-driven.

Avoid duplicating album-specific UI logic.

Adding another album should require adding data/assets rather than creating a new component.

## Scope

Do not introduce unnecessary:

- authentication
- databases
- accounts
- recommendation systems
- social functionality
- CMS
- analytics
- third-party streaming APIs

Keep the architecture appropriately simple for the project's scale.

## Development

Make changes in small, verifiable steps.

Keep the application runnable.

After meaningful changes, verify the implementation before proceeding.

Prioritize a complete working product over premature abstraction.

## Quality

The finished application should feel like a polished design piece rather than a developer prototype.

Pay particular attention to:

- animation
- transitions
- spacing
- typography
- responsive behavior
- interaction states
- loading states
- audio feedback
- accessibility
- performance
