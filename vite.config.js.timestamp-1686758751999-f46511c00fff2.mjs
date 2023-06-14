// vite.config.js
import { sveltekit } from "file:///Users/ajko/Code/wordplay/node_modules/@sveltejs/kit/src/exports/vite/index.js";
import path from "path";
var config = {
  plugins: [sveltekit()],
  resolve: {
    alias: {
      "@components": path.resolve("./src/components"),
      "@nodes": path.resolve("./src/nodes"),
      "@runtime": path.resolve("./src/runtime"),
      "@conflicts": path.resolve("./src/conflicts"),
      "@locale": path.resolve("./src/locale"),
      "@concepts": path.resolve("./src/concepts"),
      "@parser": path.resolve("./src/parser"),
      "@input": path.resolve("./src/input"),
      "@output": path.resolve("./src/output"),
      "@native": path.resolve("./src/native"),
      "@transforms": path.resolve("./src/transforms"),
      "@models": path.resolve("./src/models"),
      "@db": path.resolve("./src/db")
    }
  }
};
var vite_config_default = config;
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYWprby9Db2RlL3dvcmRwbGF5XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvYWprby9Db2RlL3dvcmRwbGF5L3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9hamtvL0NvZGUvd29yZHBsYXkvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBzdmVsdGVraXQgfSBmcm9tICdAc3ZlbHRlanMva2l0L3ZpdGUnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbi8qKiBAdHlwZSB7aW1wb3J0KCd2aXRlJykuVXNlckNvbmZpZ30gKi9cbmNvbnN0IGNvbmZpZyA9IHtcbiAgICBwbHVnaW5zOiBbc3ZlbHRla2l0KCldLFxuICAgIHJlc29sdmU6IHtcbiAgICAgICAgYWxpYXM6IHtcbiAgICAgICAgICAgICdAY29tcG9uZW50cyc6IHBhdGgucmVzb2x2ZSgnLi9zcmMvY29tcG9uZW50cycpLFxuICAgICAgICAgICAgJ0Bub2Rlcyc6IHBhdGgucmVzb2x2ZSgnLi9zcmMvbm9kZXMnKSxcbiAgICAgICAgICAgICdAcnVudGltZSc6IHBhdGgucmVzb2x2ZSgnLi9zcmMvcnVudGltZScpLFxuICAgICAgICAgICAgJ0Bjb25mbGljdHMnOiBwYXRoLnJlc29sdmUoJy4vc3JjL2NvbmZsaWN0cycpLFxuICAgICAgICAgICAgJ0Bsb2NhbGUnOiBwYXRoLnJlc29sdmUoJy4vc3JjL2xvY2FsZScpLFxuICAgICAgICAgICAgJ0Bjb25jZXB0cyc6IHBhdGgucmVzb2x2ZSgnLi9zcmMvY29uY2VwdHMnKSxcbiAgICAgICAgICAgICdAcGFyc2VyJzogcGF0aC5yZXNvbHZlKCcuL3NyYy9wYXJzZXInKSxcbiAgICAgICAgICAgICdAaW5wdXQnOiBwYXRoLnJlc29sdmUoJy4vc3JjL2lucHV0JyksXG4gICAgICAgICAgICAnQG91dHB1dCc6IHBhdGgucmVzb2x2ZSgnLi9zcmMvb3V0cHV0JyksXG4gICAgICAgICAgICAnQG5hdGl2ZSc6IHBhdGgucmVzb2x2ZSgnLi9zcmMvbmF0aXZlJyksXG4gICAgICAgICAgICAnQHRyYW5zZm9ybXMnOiBwYXRoLnJlc29sdmUoJy4vc3JjL3RyYW5zZm9ybXMnKSxcbiAgICAgICAgICAgICdAbW9kZWxzJzogcGF0aC5yZXNvbHZlKCcuL3NyYy9tb2RlbHMnKSxcbiAgICAgICAgICAgICdAZGInOiBwYXRoLnJlc29sdmUoJy4vc3JjL2RiJyksXG4gICAgICAgIH0sXG4gICAgfSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNvbmZpZztcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNlAsU0FBUyxpQkFBaUI7QUFDdlIsT0FBTyxVQUFVO0FBR2pCLElBQU0sU0FBUztBQUFBLEVBQ1gsU0FBUyxDQUFDLFVBQVUsQ0FBQztBQUFBLEVBQ3JCLFNBQVM7QUFBQSxJQUNMLE9BQU87QUFBQSxNQUNILGVBQWUsS0FBSyxRQUFRLGtCQUFrQjtBQUFBLE1BQzlDLFVBQVUsS0FBSyxRQUFRLGFBQWE7QUFBQSxNQUNwQyxZQUFZLEtBQUssUUFBUSxlQUFlO0FBQUEsTUFDeEMsY0FBYyxLQUFLLFFBQVEsaUJBQWlCO0FBQUEsTUFDNUMsV0FBVyxLQUFLLFFBQVEsY0FBYztBQUFBLE1BQ3RDLGFBQWEsS0FBSyxRQUFRLGdCQUFnQjtBQUFBLE1BQzFDLFdBQVcsS0FBSyxRQUFRLGNBQWM7QUFBQSxNQUN0QyxVQUFVLEtBQUssUUFBUSxhQUFhO0FBQUEsTUFDcEMsV0FBVyxLQUFLLFFBQVEsY0FBYztBQUFBLE1BQ3RDLFdBQVcsS0FBSyxRQUFRLGNBQWM7QUFBQSxNQUN0QyxlQUFlLEtBQUssUUFBUSxrQkFBa0I7QUFBQSxNQUM5QyxXQUFXLEtBQUssUUFBUSxjQUFjO0FBQUEsTUFDdEMsT0FBTyxLQUFLLFFBQVEsVUFBVTtBQUFBLElBQ2xDO0FBQUEsRUFDSjtBQUNKO0FBRUEsSUFBTyxzQkFBUTsiLAogICJuYW1lcyI6IFtdCn0K
