export const bigintTransformer = {
  to: (value: number | string | null | undefined) =>
    value !== null && value !== undefined ? value : 0,
  from: (value: string | number | null | undefined) =>
    value !== null && value !== undefined ? Number(value) : 0,
};
