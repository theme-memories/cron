{ pkgs, ... }: {
  channel = "unstable";
  packages = [
    pkgs.nodejs_24
    pkgs.pnpm
    pkgs.gnupg
    pkgs.openssh
  ];
  idx = {
    extensions = [
      "mhutchie.git-graph"
      "oderwat.indent-rainbow"
      "esbenp.prettier-vscode"
      "google.gemini-cli-vscode-ide-companion"
      "dbaeumer.vscode-eslint"
      "IBM.output-colorizer"
      "EditorConfig.EditorConfig"
    ];
    workspace = {
      onCreate = { default.openFiles = [ "src/index.ts" ]; };
      onStart = { default.openFiles = [ "src/index.ts" ]; };
    };
  };
}
