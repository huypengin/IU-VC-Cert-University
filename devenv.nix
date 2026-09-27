{ ... }:
{
  # Using bun instead of nodejs
  languages.javascript = {
    enable = true;
    nodejs.enable = false;
    lsp.enable = false;
    bun.enable = true;
  };
}