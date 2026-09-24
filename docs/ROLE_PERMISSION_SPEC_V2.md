# AIKON Role & Permission Specification v2

## Role model

AIKON has one system role and four operational roles.

- **Admin** — system administration. Preserved and never replaced by an operational role.
- **Owner** — project governance and oversight.
- **PM & Supervisor** — project execution, location structure, assignment and operational review.
- **Field User** — field data collection and AI scanning within assigned scope.
- **QA/QC** — independent quality verification, checklist and quality records.

## Core rule

Authorization is based on:

**Role + Project membership + Assigned scope + Permission**

The UI must not be treated as the security boundary. Supabase RLS remains authoritative.

## Permission matrix

| Capability | Admin | Owner | PM & Supervisor | Field User | QA/QC |
|---|---:|---:|---:|---:|---:|
| System administration | ✓ | — | — | — | — |
| User/role approval | ✓ | — | — | — | — |
| View project | ✓ | ✓ | ✓ | Assigned | ✓ |
| Manage project structure | ✓ | ✓ | ✓ | — | — |
| Manage Building/Floor/Room | ✓ | ✓ | ✓ | — | — |
| Manage asset master | ✓ | View | ✓ | — | View |
| AI scan | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit field inspection | ✓ | ✓ | ✓ | ✓ | ✓ |
| Review operational submission | ✓ | ✓ | ✓ | — | ✓ |
| Quality checklist | ✓ | ✓ | ✓ | View | ✓ |
| QA/QC verification | ✓ | View | View | — | ✓ |
| NCR / quality issue | ✓ | View | Monitor | Report | ✓ |
| Project dashboard | ✓ | ✓ | ✓ | Assigned scope | ✓ |
| Audit visibility | ✓ | ✓ | ✓ | Own submissions | ✓ |

## Workflow

Field User → AI scan / field submission → PM & Supervisor operational review → QA/QC quality verification → Owner oversight/final project decision.

A PM/Supervisor decides what operational action is required. QA/QC verifies whether the resulting work meets quality requirements. Owner governs the project. Admin governs the system.

## Registration

Public registration always creates a pending **Field User** profile regardless of the role submitted by the browser.

Admin approves the final role. The browser must never be trusted to self-assign Admin, Owner, PM & Supervisor, or QA/QC.

## Backwards compatibility

Existing legacy roles are normalized:

- admin / administrator → Admin
- Surveyor → Field User
- Supervisor / Project Manager / PM → PM & Supervisor
- QA/QC → QA/QC

## Implementation notes

The current release protects the role model in the frontend and Supabase policy layer. Project-level membership and field-user assigned-area RLS should be implemented as the next authorization migration before production use with multiple projects.
