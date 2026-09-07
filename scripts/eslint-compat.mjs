// Next's React plugin still uses these deprecated RuleContext accessors.
// Keep this narrow adapter until upstream supports ESLint 10 directly.
// API replacements: https://eslint.org/docs/latest/use/migrate-to-10.0.0
const adapted = new WeakMap();
export function compatibleConfig(config) {
  if (!config.plugins) return config;
  return {
    ...config,
    plugins: Object.fromEntries(
      Object.entries(config.plugins).map(([name, plugin]) => {
        if (!adapted.has(plugin)) {
          adapted.set(plugin, {
            ...plugin,
            rules: Object.fromEntries(
              Object.entries(plugin.rules ?? {}).map(([key, rule]) => [
                key,
                {
                  ...rule,
                  create(context) {
                    const compatible = Object.create(context, {
                      getFilename: { value: () => context.filename },
                      getPhysicalFilename: { value: () => context.physicalFilename },
                      getCwd: { value: () => context.cwd },
                      getSourceCode: { value: () => context.sourceCode },
                    });
                    return rule.create(compatible);
                  },
                },
              ]),
            ),
          });
        }
        return [name, adapted.get(plugin)];
      }),
    ),
  };
}
