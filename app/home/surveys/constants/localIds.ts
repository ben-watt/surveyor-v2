export const ID_PREFIX = {
  instance: 'local_',
  compDef: 'localdef_',
  condDef: 'locond_',
} as const;

export function isLocalInstanceId(id?: string): boolean {
  return !!id && id.startsWith(ID_PREFIX.instance);
}

export function isLocalComponentDefId(id?: string): boolean {
  return !!id && id.startsWith(ID_PREFIX.compDef);
}

export function isLocalConditionDefId(id?: string): boolean {
  return !!id && id.startsWith(ID_PREFIX.condDef);
}
