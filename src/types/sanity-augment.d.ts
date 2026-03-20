/**
 * Type augmentation for sanity@5.x + next-sanity@12.x
 *
 * The bundled .d.ts from sanity@5 uses Rollup name-mangling, which loses
 * the original export names (defineConfig, defineField, defineType, etc.)
 * even though they exist at runtime.
 *
 * Similarly, next-sanity@12 has breaking type changes for NextStudio props.
 *
 * This file restores them for TypeScript.
 * Remove when sanity ships correct type declarations.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "sanity" {
  export interface Rule {
    required(): Rule
    min(n: number): Rule
    max(n: number): Rule
    unique(): Rule
    custom(fn: (value: any, context: any) => true | string | Promise<true | string>): Rule
    warning(msg?: string): Rule
    error(msg?: string): Rule
  }

  export function defineConfig(config: any): any
  export function defineField(field: any): any
  export function defineType(type: any): any
}

declare module "sanity/structure" {
  export function structureTool(options?: any): any
}

declare module "next-sanity/studio" {
  import type { ComponentType } from "react"
  export interface NextStudioProps {
    config: any
    [key: string]: any
  }
  export const NextStudio: ComponentType<NextStudioProps>
}
