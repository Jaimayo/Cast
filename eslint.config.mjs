/** Stage 1: typecheck is the quality gate. ESLint is optional and kept out of `next build`. */
export default [
  {
    ignores: [".next/**", "node_modules/**", "db/migrations/**"],
  },
];
