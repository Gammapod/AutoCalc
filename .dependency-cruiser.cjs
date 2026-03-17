/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-domain-to-ui-app-content",
      severity: "error",
      from: { path: "^src/domain/" },
      to: { path: "^src/(ui|app|content)/" },
    },
    {
      name: "no-ui-to-app",
      severity: "error",
      from: { path: "^src/ui/" },
      to: { path: "^src/app/" },
    },
    {
      name: "no-contracts-to-content-app-ui-infra",
      severity: "error",
      from: { path: "^src/contracts/" },
      to: { path: "^src/(content|app|ui|infra)/" },
    },
    {
      name: "no-content-to-ui-app-infra",
      severity: "error",
      from: { path: "^src/content/" },
      to: { path: "^src/(ui|app|infra)/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: {
      fileName: "tsconfig.json",
    },
  },
};
