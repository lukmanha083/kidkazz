# Kidkazz Documentation

**Welcome to the Kidkazz documentation!** This README provides a structured guide to navigate our comprehensive documentation library.

---

## Quick Start

### For Developers
1. Start with [Development Setup Guide](guides/DEVELOPMENT_SETUP_GUIDE.md)
2. Understand [Architecture Overview](architecture/ARCHITECTURE.md)
3. Review [DDD Refactoring Roadmap](ddd/DDD_REFACTORING_ROADMAP.md)

### For AI Assistants (Claude)
See [CLAUDE.md](CLAUDE.md) for quick context, architecture principles, and task-specific guides.

### For Project Managers
Review [DDD Refactoring Complete Summary](ddd/DDD_REFACTORING_COMPLETE_SUMMARY.md) for progress and status.

---

## Documentation Structure

### 🏛️ Architecture (`architecture/`)
High-level system design and architectural patterns.

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](architecture/ARCHITECTURE.md) | Complete microservices architecture guide |
| [ARCHITECTURE_PROPOSAL_HEXAGONAL_DDD.md](architecture/ARCHITECTURE_PROPOSAL_HEXAGONAL_DDD.md) | Hexagonal architecture proposal |
| [DDD_HEXAGONAL_BOUNDARY_REVIEW.md](architecture/DDD_HEXAGONAL_BOUNDARY_REVIEW.md) | Bounded context review |
| [EVENT_DRIVEN_ARCHITECTURE_CLOUDFLARE.md](architecture/EVENT_DRIVEN_ARCHITECTURE_CLOUDFLARE.md) | Event-driven patterns on Cloudflare |
| [SAGA_PATTERN_DISTRIBUTED_TRANSACTIONS.md](architecture/SAGA_PATTERN_DISTRIBUTED_TRANSACTIONS.md) | Distributed transaction handling |
| [CLOUDFLARE_WORKERS_LIMITS_ANALYSIS.md](architecture/CLOUDFLARE_WORKERS_LIMITS_ANALYSIS.md) | Platform limitations and workarounds |
| [ECOMMERCE_WHOLESALE_ROADMAP.md](architecture/ECOMMERCE_WHOLESALE_ROADMAP.md) | Dual-market e-commerce platform roadmap |
| [RETAIL_WHOLESALE_ARCHITECTURE.md](architecture/RETAIL_WHOLESALE_ARCHITECTURE.md) | Retail + Wholesale architecture design |

**Start here if you want to**: Understand system design, learn about microservices communication, or review architectural decisions.

---

### 📐 DDD Core (`ddd/`)
Domain-Driven Design refactoring documentation - **THE SOURCE OF TRUTH**.

| Document | Description | Priority |
|----------|-------------|----------|
| [DDD_REFACTORING_ROADMAP.md](ddd/DDD_REFACTORING_ROADMAP.md) | **MASTER PLAN** - Complete 8-phase refactoring roadmap | ⭐ CRITICAL |
| [DDD_REFACTORING_COMPLETE_SUMMARY.md](ddd/DDD_REFACTORING_COMPLETE_SUMMARY.md) | Phases 1-6 completion summary | High |
| [DDD_PHASE4_TYPE_ERRORS_FIX.md](ddd/DDD_PHASE4_TYPE_ERRORS_FIX.md) | Phase 4 TypeScript errors resolution (69 errors fixed) | High |
| [BUSINESS_RULES.md](ddd/BUSINESS_RULES.md) | All business rules and constraints | High |
| [DDD_ANALYSIS_AND_FIX.md](ddd/DDD_ANALYSIS_AND_FIX.md) | Original DDD violations analysis | Reference |

**Current Status**:
- ✅ Phases 1-6: Complete
- ⏳ Phase 7: Inter-Warehouse Transfer - **PENDING**
- ⏳ Phase 8: Stock Opname & Physical Bundles - **PENDING**

**Start here if you want to**: Understand the refactoring plan, implement Phase 7 or 8, or learn about domain boundaries.

---

### 🎯 Bounded Contexts (`bounded-contexts/`)
Domain-specific documentation organized by microservice.

#### Accounting (`bounded-contexts/accounting/`)
| Document | Description |
|----------|-------------|
| [ACCOUNTING_SERVICE_ARCHITECTURE.md](bounded-contexts/accounting/ACCOUNTING_SERVICE_ARCHITECTURE.md) | Service design and structure |
| [ACCOUNTING_TUTORIAL.md](bounded-contexts/accounting/ACCOUNTING_TUTORIAL.md) | Step-by-step accounting guide |
| [ACCOUNTING_RESEARCH.md](bounded-contexts/accounting/ACCOUNTING_RESEARCH.md) | Research and decisions |
| [PAYMENT_METHOD_AND_JOURNAL_ENTRY_LOGIC.md](bounded-contexts/accounting/PAYMENT_METHOD_AND_JOURNAL_ENTRY_LOGIC.md) | Double-entry bookkeeping logic |

#### Inventory (`bounded-contexts/inventory/`)
| Document | Description |
|----------|-------------|
| [WEBSOCKET_REALTIME_INVENTORY.md](bounded-contexts/inventory/WEBSOCKET_REALTIME_INVENTORY.md) | Real-time stock updates via WebSocket |
| [PRODUCT_BUNDLES_STOCK_HANDLING.md](bounded-contexts/inventory/PRODUCT_BUNDLES_STOCK_HANDLING.md) | Virtual vs Physical bundles |
| [UOM_CONVERSION_PROCEDURE.md](bounded-contexts/inventory/UOM_CONVERSION_PROCEDURE.md) | Unit of measure conversions |

#### Product (`bounded-contexts/product/`)
| Document | Description |
|----------|-------------|
| [PRODUCT_SERVICE_IMPLEMENTATION_PLAN.md](bounded-contexts/product/PRODUCT_SERVICE_IMPLEMENTATION_PLAN.md) | Service implementation roadmap |

#### Frontend (`bounded-contexts/frontend/`)
| Document | Description |
|----------|-------------|
| [FRONTEND_ARCHITECTURE.md](bounded-contexts/frontend/FRONTEND_ARCHITECTURE.md) | Next.js + ShadCN UI architecture |
| [FRONTEND_REFACTORING_ROADMAP.md](bounded-contexts/frontend/FRONTEND_REFACTORING_ROADMAP.md) | Frontend modernization plan |
| [FRONTEND_INTEGRATION_ROADMAP.md](bounded-contexts/frontend/FRONTEND_INTEGRATION_ROADMAP.md) | DDD + tRPC frontend integration |
| [POS_VARIANT_SELECTION_WORKFLOW.md](bounded-contexts/frontend/POS_VARIANT_SELECTION_WORKFLOW.md) | Point-of-sale variant selection UX |

**Start here if you want to**: Work on a specific service, understand domain responsibilities, or implement service-specific features.

---

### 🔨 Implementation (`implementation/`)
Implementation strategies and architectural decisions.

#### Strategies (`implementation/strategies/`)
| Document | Description |
|----------|-------------|
| [CASCADE_DELETE_STRATEGY.md](implementation/strategies/CASCADE_DELETE_STRATEGY.md) | Cascade delete handling |
| [LOCATION_FIELDS_STRATEGY.md](implementation/strategies/LOCATION_FIELDS_STRATEGY.md) | Physical location tracking |
| [MULTI_WAREHOUSE_REFACTOR_PLAN.md](implementation/strategies/MULTI_WAREHOUSE_REFACTOR_PLAN.md) | Multi-warehouse allocation strategy |

**Start here if you want to**: Understand implementation strategies and architectural decisions.

---

### 🧪 Testing (`testing/`)
Comprehensive testing documentation and guides.

| Document | Description |
|----------|-------------|
| [DDD_REFACTORING_TESTING_GUIDE.md](testing/DDD_REFACTORING_TESTING_GUIDE.md) | Complete E2E testing guide (909 lines!) |
| [TESTING.md](testing/TESTING.md) | General testing practices |
| [INVENTORY_INTEGRATION_TESTING.md](testing/INVENTORY_INTEGRATION_TESTING.md) | Inventory service integration tests |
| [TESTING_PLAN.md](testing/TESTING_PLAN.md) | Comprehensive testing strategy |
| [TESTING_ROADMAP.md](testing/TESTING_ROADMAP.md) | Testing implementation roadmap |
| [MANUAL_TESTING_CHECKLIST.md](testing/MANUAL_TESTING_CHECKLIST.md) | Step-by-step manual testing |
| [MULTI_WAREHOUSE_TESTING.md](testing/MULTI_WAREHOUSE_TESTING.md) | Multi-warehouse feature testing |

**Start here if you want to**: Write tests, run test suites, or understand testing strategy.

---

### 📚 Guides (`guides/`)
How-to guides and tutorials.

| Document | Description | Priority |
|----------|-------------|----------|
| [UI_DESIGN_GUIDELINE.md](guides/UI_DESIGN_GUIDELINE.md) | ⭐ **Complete UI/UX Design System** - Brand, colors, typography, responsive patterns, component guidelines | **MUST READ** |
| [DEVELOPMENT_SETUP_GUIDE.md](guides/DEVELOPMENT_SETUP_GUIDE.md) | Local environment setup | High |
| [INTEGRATION_QUICK_START.md](guides/INTEGRATION_QUICK_START.md) | Quick integration guide | High |
| [INTEGRATION_TUTORIAL.md](guides/INTEGRATION_TUTORIAL.md) | Step-by-step integration tutorial | Medium |
| [IMAGE_HANDLING_GUIDE.md](guides/IMAGE_HANDLING_GUIDE.md) | Image upload and management | Medium |
| [IMAGE_ENHANCEMENTS_GUIDE.md](guides/IMAGE_ENHANCEMENTS_GUIDE.md) | Image optimization techniques | Low |
| [VIDEO_HANDLING_GUIDE.md](guides/VIDEO_HANDLING_GUIDE.md) | Video upload and management | Low |
| [SHADCN_UI_REFACTORING_GUIDE.md](guides/SHADCN_UI_REFACTORING_GUIDE.md) | ShadCN UI component migration | Medium |
| [CRON_CONFIGURATION.md](guides/CRON_CONFIGURATION.md) | Scheduled jobs setup | Low |
| [WEIGHT_BASED_BARCODE_GUIDE.md](guides/WEIGHT_BASED_BARCODE_GUIDE.md) | Weight-based barcode system for POS | Medium |
| [MOBILE_APP_EXPO_GUIDE.md](guides/MOBILE_APP_EXPO_GUIDE.md) | Mobile app development with Expo | Medium |
| [SERVICE_STARTUP_GUIDE.md](guides/SERVICE_STARTUP_GUIDE.md) | Microservices startup guide | High |
| [EXPIRATION_DATE_FEATURE_GUIDE.md](guides/EXPIRATION_DATE_FEATURE_GUIDE.md) | Product expiration tracking | Medium |
| [MULTI_UOM_BARCODE_IMPLEMENTATION.md](guides/MULTI_UOM_BARCODE_IMPLEMENTATION.md) | Multi-UOM barcode implementation | Medium |
| [MULTI_WAREHOUSE_UOM_API_GUIDE.md](guides/MULTI_WAREHOUSE_UOM_API_GUIDE.md) | Multi-warehouse UOM API guide | Medium |
| [DATABASE_MIGRATION_RETAIL_WHOLESALE.md](guides/DATABASE_MIGRATION_RETAIL_WHOLESALE.md) | Database migration for dual markets | Low |

**Start here if you want to**: Set up your development environment, learn specific features, or follow tutorials.

---

### 🔗 Integration (`integration/`)
Cross-service integration and external systems.

| Document | Description |
|----------|-------------|
| [MICROSERVICES_INTEGRATION_ROADMAP.md](integration/MICROSERVICES_INTEGRATION_ROADMAP.md) | Service-to-service integration plan |
| [RBAC_IMPLEMENTATION_PLAN.md](integration/RBAC_IMPLEMENTATION_PLAN.md) | Role-based access control design |
| [BACKEND_INTEGRATION_REQUIREMENTS.md](integration/BACKEND_INTEGRATION_REQUIREMENTS.md) | Backend API integration requirements |

**Start here if you want to**: Integrate services, implement RBAC, or understand cross-cutting concerns.

---

### 🛠️ Tooling (`tooling/`)
Development tools and CI/CD.

| Document | Description |
|----------|-------------|
| [SENTRY_CLAUDE_GITHUB_INTEGRATION.md](tooling/SENTRY_CLAUDE_GITHUB_INTEGRATION.md) | Error tracking and AI integration |
| [DEPENDENCY_STATUS.md](tooling/DEPENDENCY_STATUS.md) | Dependency status and deprecation warnings |
| [ESLINT_WARNINGS_EXPLAINED.md](tooling/ESLINT_WARNINGS_EXPLAINED.md) | ESLint warnings explanation and fixes |

**Start here if you want to**: Set up monitoring, error tracking, or development tools.

---

## Common Workflows

### I want to implement Phase 7 (Inter-Warehouse Transfer)
1. Read: [DDD Refactoring Roadmap - Phase 7](ddd/DDD_REFACTORING_ROADMAP.md) (lines 1101-2399)
2. Review: [Business Rules](ddd/BUSINESS_RULES.md)
3. Understand: [Inventory Service Docs](bounded-contexts/inventory/)
4. Test: [DDD Refactoring Testing Guide](testing/DDD_REFACTORING_TESTING_GUIDE.md)

### I want to implement Phase 8 (Stock Opname & Physical Bundles)
1. Read: [DDD Refactoring Roadmap - Phase 8](ddd/DDD_REFACTORING_ROADMAP.md) (lines 2400+)
2. Review: [Product Bundles Stock Handling](bounded-contexts/inventory/PRODUCT_BUNDLES_STOCK_HANDLING.md)
3. Understand: [Business Rules](ddd/BUSINESS_RULES.md)
4. Test: [DDD Refactoring Testing Guide](testing/DDD_REFACTORING_TESTING_GUIDE.md)

### I want to fix a bug
1. Check: [Business Rules](ddd/BUSINESS_RULES.md) - ensure you understand constraints
2. Review: [Architecture](architecture/ARCHITECTURE.md) - understand service boundaries
3. Test: [Testing Guide](testing/DDD_REFACTORING_TESTING_GUIDE.md) - run relevant tests

### I want to add a new feature
1. Design: [Architecture Proposal](architecture/ARCHITECTURE_PROPOSAL_HEXAGONAL_DDD.md) - follow patterns
2. Review: [DDD Refactoring Roadmap](ddd/DDD_REFACTORING_ROADMAP.md) - understand context
3. Implement: Follow hexagonal architecture (Domain → Application → Infrastructure)
4. Test: [Testing Guide](testing/DDD_REFACTORING_TESTING_GUIDE.md)
5. Document: Update relevant bounded context docs

### I want to set up my development environment
1. Start: [Development Setup Guide](guides/DEVELOPMENT_SETUP_GUIDE.md)
2. Integration: [Integration Quick Start](guides/INTEGRATION_QUICK_START.md)
3. Testing: [Testing Guide](testing/TESTING.md)

### I want to understand the overall architecture
1. Overview: [Architecture](architecture/ARCHITECTURE.md)
2. DDD: [DDD Hexagonal Boundary Review](architecture/DDD_HEXAGONAL_BOUNDARY_REVIEW.md)
3. Events: [Event-Driven Architecture](architecture/EVENT_DRIVEN_ARCHITECTURE_CLOUDFLARE.md)
4. Transactions: [Saga Pattern](architecture/SAGA_PATTERN_DISTRIBUTED_TRANSACTIONS.md)

### I want to work on the frontend
1. **START HERE**: [UI Design Guideline](guides/UI_DESIGN_GUIDELINE.md) - ⭐ **MUST READ** for ALL frontend work
2. Architecture: [Frontend Architecture](bounded-contexts/frontend/FRONTEND_ARCHITECTURE.md)
3. Roadmap: [Frontend Refactoring Roadmap](bounded-contexts/frontend/FRONTEND_REFACTORING_ROADMAP.md)
4. Components: [ShadCN UI Refactoring Guide](guides/SHADCN_UI_REFACTORING_GUIDE.md)

### I want to create a new UI page/component
1. **MANDATORY**: Read [UI Design Guideline](guides/UI_DESIGN_GUIDELINE.md) - Complete design system
2. **Brand**: Review color palette, typography, and component styles
3. **Responsive**: Follow [Button Patterns](guides/UI_DESIGN_GUIDELINE.md#button-responsive-patterns) for page headers
4. **Grids**: Use [Card & Grid Layouts](guides/UI_DESIGN_GUIDELINE.md#card--grid-layout-patterns) for responsive layouts
5. **Tables**: Implement [Table Components](guides/UI_DESIGN_GUIDELINE.md#table-component-patterns) with column visibility
6. **Search**: Add [Global Search](guides/UI_DESIGN_GUIDELINE.md#search-component-patterns) for search functionality
7. **Forms**: Follow [Form Layout Patterns](guides/UI_DESIGN_GUIDELINE.md#form-layout-patterns) for responsive grids
8. **Drawers**: Use [Drawer Patterns](guides/UI_DESIGN_GUIDELINE.md#drawer-component-patterns) for forms/details
9. **Test**: At breakpoints 320px, 375px, 768px, 1024px, 1440px
10. **Checklist**: Use [Quick Reference Checklist](guides/UI_DESIGN_GUIDELINE.md#quick-reference-checklist) before PR

### I want to work on accounting
1. Architecture: [Accounting Service Architecture](bounded-contexts/accounting/ACCOUNTING_SERVICE_ARCHITECTURE.md)
2. Tutorial: [Accounting Tutorial](bounded-contexts/accounting/ACCOUNTING_TUTORIAL.md)
3. Logic: [Payment Method & Journal Entry Logic](bounded-contexts/accounting/PAYMENT_METHOD_AND_JOURNAL_ENTRY_LOGIC.md)

---

## Documentation Principles

### Our Documentation Philosophy
1. **Single Source of Truth**: DDD Refactoring Roadmap is the master plan
2. **Bounded Context Separation**: Each service has its own documentation folder
3. **Implementation Tracking**: Phase-by-phase progress documentation
4. **Testing Focus**: Comprehensive testing guides for all features
5. **AI-Friendly**: CLAUDE.md provides quick context for AI assistants

### When to Update Documentation
- Adding new features → Update bounded context docs
- Changing business rules → Update BUSINESS_RULES.md
- Completing a phase → Update phase summary docs
- Architectural changes → Update architecture docs
- New testing scenarios → Update testing guides

### Documentation Standards
- Use markdown for all docs
- Include code examples where relevant
- Add diagrams for complex workflows
- Keep table of contents updated
- Link between related documents
- Version important documents

---

## Key Terms Glossary

| Term | Definition |
|------|------------|
| **DDD** | Domain-Driven Design - software design approach focused on modeling business domains |
| **Hexagonal Architecture** | Ports & Adapters pattern - isolates core business logic from infrastructure |
| **Bounded Context** | Explicit boundary within which a domain model is defined and applicable |
| **Aggregate** | Cluster of domain objects treated as a single unit for data changes |
| **FEFO** | First Expired, First Out - inventory picking strategy |
| **Saga Pattern** | Distributed transaction pattern with compensating actions |
| **Optimistic Locking** | Concurrency control using version numbers |
| **UOM** | Unit of Measure (e.g., PCS, BOX, KG) |
| **Virtual Bundle** | Product bundle with calculated stock (no physical inventory) |
| **Physical Bundle** | Pre-assembled bundle with own stock inventory |
| **Stock Opname** | Physical inventory count and reconciliation |
| **Durable Object** | Cloudflare Workers primitive for stateful coordination |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-13 | Initial documentation reorganization |

---

## Contributing to Documentation

### Adding New Documentation
1. Place in appropriate folder (architecture/ddd/bounded-contexts/etc.)
2. Update this README with link and description
3. Add to relevant workflow sections
4. Update CLAUDE.md if AI-relevant

### Updating Existing Documentation
1. Maintain version history in document
2. Update "Last Updated" date
3. Update related documents if needed
4. Keep CLAUDE.md in sync

---

## Support

### For Questions
- Check this README first
- Review CLAUDE.md for AI context
- Search relevant bounded context docs
- Review architecture docs for design questions

### For Issues
- Document in GitHub Issues
- Link to relevant documentation
- Propose documentation updates if needed

---

**Last Updated**: 2025-12-13
**Maintained by**: Kidkazz Development Team
**AI Context**: See [CLAUDE.md](CLAUDE.md)
