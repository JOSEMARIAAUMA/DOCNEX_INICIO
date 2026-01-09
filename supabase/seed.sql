-- DOCNEX Sprint 2.1 Hyper-Complex Seed Data

-- 1. Workspace
INSERT INTO public.workspaces (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'DOCNEX GRC Solutions')
ON CONFLICT (id) DO NOTHING;

-- 2. Project
INSERT INTO public.projects (id, workspace_id, name, description)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'CIBERSEGURIDAD 2024-2026', 'Plan Director de Ciberseguridad enfocado en cumplimiento NIS2 y resiliencia operacional.')
ON CONFLICT (id) DO NOTHING;

-- 3. Document
INSERT INTO public.documents (id, project_id, title, status)
VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Plan Director de Ciberseguridad (Draft)', 'draft')
ON CONFLICT (id) DO NOTHING;

-- 4. Document Blocks (Extensive Content)
INSERT INTO public.document_blocks (id, document_id, order_index, title, content, block_type)
VALUES 
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 1, 'I. Resumen Ejecutivo', 
'El presente Plan Director de Ciberseguridad (PDC) define la hoja de ruta estratégica para fortalecer la postura de seguridad de la organización. 

**Objetivos Clave:**
- Reducción del riesgo de impacto en un 40%.
- Cumplimiento 100% con la directiva NIS2.
- Implementación de arquitectura Zero Trust.

*Nota: Este documento es confidencial y solo para uso interno.*', 'section'),

('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 2, 'II. Análisis de Riesgos', 
'### Matriz de Riesgos Principales

| Activo | Amenaza | Impacto | Probabilidad | Nivel |
|--------|---------|---------|--------------|-------|
| Datos cliente | Ransomware | Crítico | Media | ALTO |
| Infraestructura | DDoS | Alto | Alta | MUY ALTO |
| Personal | Phishing | Medio | Muy Alta | ALTO |

El análisis se basa en la metodología MAGERIT y los estándares ISO/IEC 27005. Se recomienda un monitoreo 24/7 mediante SOC externo.', 'section'),

('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 3, 'III. Requisitos NIS2', 
'La directiva NIS2 introduce requisitos de seguridad más estrictos para entidades esenciales e importantes.

1. **Gestión de Riesgos:** Las entidades deben implementar medidas técnicas y organizativas proporcionadas.
2. **Seguridad de la cadena de suministro:** Evaluación de proveedores externos.
3. **Criptografía:** Uso de cifrado de extremo a extremo donde sea posible.

> "La ciberseguirdad ya no es un problema técnico, sino un imperativo de resiliencia empresarial"', 'section'),

('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 4, 'IV. Presupuesto Estimado', 
'| Concepto | Coste 2024 | Coste 2025 |
|----------|------------|------------|
| Licencias SIEM | 15.000€ | 15.500€ |
| Auditoría Ext. | 8.000€ | 8.000€ |
| Formación | 5.000€ | 4.500€ |
| **TOTAL** | **28.000€**| **28.000€**|', 'section'),

('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', 5, 'V. Referencias Externas', 
'Se han consultado los siguientes marcos de trabajo:
- NIST Cybersecurity Framework v2.0
- ISO/IEC 27001:2022
- ENS (Esquema Nacional de Seguridad) - Nivel Medio', 'section')
ON CONFLICT (id) DO NOTHING;

-- 5. Resources (Realistic Files)
INSERT INTO public.resources (id, project_id, kind, title, source_uri, tags, file_size, mime_type)
VALUES 
('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'pdf', 'Directiva NIS2 (Oficial)', 'https://eur-lex.europa.eu/legal-content/ES/TXT/PDF/?uri=CELEX:32022L2555', '{link, nis2, legal}', 2450000, 'application/pdf'),
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'pdf', 'NIST CSF 2.0 Guide', 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1299.pdf', '{nist, best-practice}', 1200000, 'application/pdf'),
('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'txt', 'Minuta Reunión Comité', null, '{internal, confidential}', 4500, 'text/plain')
ON CONFLICT (id) DO NOTHING;

-- 6. Resource Extracts (Specific segments)
INSERT INTO public.resource_extracts (id, resource_id, label, excerpt, locator)
VALUES 
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Art. 21 - Medidas de gestión', 'Las entidades (...) deberán adoptar medidas técnicas, operativas y de organización adecuadas y proporcionadas.', '{"page": 45}'),
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Identificar (ID)', 'Comprender el contexto del riesgo de seguridad, los activos que soportan las funciones críticas.', '{"section": "ID.AM"}')
ON CONFLICT (id) DO NOTHING;

-- 7. Block-Resource Links
INSERT INTO public.block_resource_links (id, block_id, resource_id, extract_id, relation, note)
VALUES 
('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'cites', 'Base legal para la gestión de riesgos en el bloque III.'),
('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'supports', 'Respalda la metodología de identificación de activos.'),
('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', null, 'reference', 'Referencia general al marco NIST.')
ON CONFLICT (id) DO NOTHING;
