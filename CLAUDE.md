# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **42 School "transcendence" project** - a web-based Pong game contest platform with real-time multiplayer functionality. The project requirements are documented in Japanese in `requirements.md`.

## Key Project Requirements

### Core Architecture
- **Single Page Application (SPA)** with browser back/forward button support
- **Docker-based deployment** - everything must run with a single command
- **TypeScript frontend** (can be extended with Tailwind CSS as minor module)
- **Real-time multiplayer Pong game** playable directly in browser
- **Tournament system** with matchmaking and player registration
- **Security focus**: HTTPS/WSS, password hashing, SQL injection/XSS protection

### Technology Constraints
- Frontend: TypeScript base (optional: Tailwind CSS)
- Backend: Default language or Node.js with Fastify (as major module)
- Database: SQLite (if using database module)
- No complete solution libraries - only small utilities for specific tasks
- Must be compatible with latest stable Mozilla Firefox

### Module System
- Base project worth 25% - requires 7 major modules for 100%
- 2 minor modules = 1 major module
- Available modules include: Backend Framework, Frontend Framework, Database, etc.

## Development Commands

**Note**: This project currently contains only requirements documentation. No build system, package manager, or development commands have been set up yet.

When implementing the project, typical commands will likely include:
- Docker build and run commands
- Frontend build/dev server commands  
- Backend server commands
- Database migration/setup commands

## Security Requirements

- All passwords must be hashed
- HTTPS/WSS connections mandatory for all backend communication
- Form validation required (client-side if no backend, server-side if backend exists)
- API routes must be protected
- Environment variables (.env) must be used for credentials and never committed
- Protection against SQL injection and XSS attacks

## Game Requirements

### Core Gameplay
- Real-time multiplayer Pong (local keyboard for base version)
- Tournament system with multiple players
- Player registration with aliases (resets per tournament unless using User Management module)
- Matchmaking system for tournament organization
- All players must have identical paddle speeds (including AI if implemented)

### Visual Requirements
- Must capture essence of original Pong (1972)
- Can have different visual aesthetics but core gameplay must remain
- Must follow frontend constraints or use Graphics module override

## Project Structure

Currently only contains:
- `requirements.md` - Project requirements in Japanese (42 School format)

## Important Notes

- This appears to be the initial project setup with only requirements
- Implementation needs to follow 42 School evaluation criteria
- Library usage will be evaluated for appropriateness vs. "complete solution" prohibition
- Final evaluation will check security implementation, functionality, and adherence to constraints