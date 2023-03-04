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
      "@translation": path.resolve("./src/translation"),
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYWprby9Db2RlL3dvcmRwbGF5XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvYWprby9Db2RlL3dvcmRwbGF5L3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9hamtvL0NvZGUvd29yZHBsYXkvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBzdmVsdGVraXQgfSBmcm9tICdAc3ZlbHRlanMva2l0L3ZpdGUnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbi8qKiBAdHlwZSB7aW1wb3J0KCd2aXRlJykuVXNlckNvbmZpZ30gKi9cbmNvbnN0IGNvbmZpZyA9IHtcbiAgICBwbHVnaW5zOiBbc3ZlbHRla2l0KCldLFxuICAgIHJlc29sdmU6IHtcbiAgICAgICAgYWxpYXM6IHtcbiAgICAgICAgICAgICdAY29tcG9uZW50cyc6IHBhdGgucmVzb2x2ZSgnLi9zcmMvY29tcG9uZW50cycpLFxuICAgICAgICAgICAgJ0Bub2Rlcyc6IHBhdGgucmVzb2x2ZSgnLi9zcmMvbm9kZXMnKSxcbiAgICAgICAgICAgICdAcnVudGltZSc6IHBhdGgucmVzb2x2ZSgnLi9zcmMvcnVudGltZScpLFxuICAgICAgICAgICAgJ0Bjb25mbGljdHMnOiBwYXRoLnJlc29sdmUoJy4vc3JjL2NvbmZsaWN0cycpLFxuICAgICAgICAgICAgJ0B0cmFuc2xhdGlvbic6IHBhdGgucmVzb2x2ZSgnLi9zcmMvdHJhbnNsYXRpb24nKSxcbiAgICAgICAgICAgICdAY29uY2VwdHMnOiBwYXRoLnJlc29sdmUoJy4vc3JjL2NvbmNlcHRzJyksXG4gICAgICAgICAgICAnQHBhcnNlcic6IHBhdGgucmVzb2x2ZSgnLi9zcmMvcGFyc2VyJyksXG4gICAgICAgICAgICAnQGlucHV0JzogcGF0aC5yZXNvbHZlKCcuL3NyYy9pbnB1dCcpLFxuICAgICAgICAgICAgJ0BvdXRwdXQnOiBwYXRoLnJlc29sdmUoJy4vc3JjL291dHB1dCcpLFxuICAgICAgICAgICAgJ0BuYXRpdmUnOiBwYXRoLnJlc29sdmUoJy4vc3JjL25hdGl2ZScpLFxuICAgICAgICAgICAgJ0B0cmFuc2Zvcm1zJzogcGF0aC5yZXNvbHZlKCcuL3NyYy90cmFuc2Zvcm1zJyksXG4gICAgICAgICAgICAnQG1vZGVscyc6IHBhdGgucmVzb2x2ZSgnLi9zcmMvbW9kZWxzJyksXG4gICAgICAgICAgICAnQGRiJzogcGF0aC5yZXNvbHZlKCcuL3NyYy9kYicpLFxuICAgICAgICB9LFxuICAgIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjb25maWc7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTZQLFNBQVMsaUJBQWlCO0FBQ3ZSLE9BQU8sVUFBVTtBQUdqQixJQUFNLFNBQVM7QUFBQSxFQUNYLFNBQVMsQ0FBQyxVQUFVLENBQUM7QUFBQSxFQUNyQixTQUFTO0FBQUEsSUFDTCxPQUFPO0FBQUEsTUFDSCxlQUFlLEtBQUssUUFBUSxrQkFBa0I7QUFBQSxNQUM5QyxVQUFVLEtBQUssUUFBUSxhQUFhO0FBQUEsTUFDcEMsWUFBWSxLQUFLLFFBQVEsZUFBZTtBQUFBLE1BQ3hDLGNBQWMsS0FBSyxRQUFRLGlCQUFpQjtBQUFBLE1BQzVDLGdCQUFnQixLQUFLLFFBQVEsbUJBQW1CO0FBQUEsTUFDaEQsYUFBYSxLQUFLLFFBQVEsZ0JBQWdCO0FBQUEsTUFDMUMsV0FBVyxLQUFLLFFBQVEsY0FBYztBQUFBLE1BQ3RDLFVBQVUsS0FBSyxRQUFRLGFBQWE7QUFBQSxNQUNwQyxXQUFXLEtBQUssUUFBUSxjQUFjO0FBQUEsTUFDdEMsV0FBVyxLQUFLLFFBQVEsY0FBYztBQUFBLE1BQ3RDLGVBQWUsS0FBSyxRQUFRLGtCQUFrQjtBQUFBLE1BQzlDLFdBQVcsS0FBSyxRQUFRLGNBQWM7QUFBQSxNQUN0QyxPQUFPLEtBQUssUUFBUSxVQUFVO0FBQUEsSUFDbEM7QUFBQSxFQUNKO0FBQ0o7QUFFQSxJQUFPLHNCQUFROyIsCiAgIm5hbWVzIjogW10KfQo=
