// Durante a migração JS→TS (DEC-5), arquivos .js fazem `require()` de módulos que já são .ts.
// O Vitest só transforma `import`; este hook do tsx ensina o `require` nativo a carregar .ts
// (o mesmo mecanismo usado por `npm run dev`). Pode sair quando o backend for 100% TS/ESM (T3).
import { register } from 'tsx/cjs/api';

register();
