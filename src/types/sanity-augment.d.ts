/**
 * Type augmentation for sanity@5.x
 *
 * The bundled .d.ts from sanity@5 uses Rollup name-mangling, which loses
 * the original export names (defineField, defineType, etc.) even though
 * they exist at runtime. This file restores them for TypeScript.
 *
 * Remove when sanity ships correct type declarations.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "sanity" {
  export function defineField(field: any): any
  export function defineType(type: any): any
}
