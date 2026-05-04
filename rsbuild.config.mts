import { defineConfig, type OutputConfig, type EnvironmentConfig } from '@rsbuild/core'
import { pluginVue } from '@rsbuild/plugin-vue';

const getElectronOutput = (type: "main" | "preload") => {
    const config: OutputConfig = {
        distPath: {
            root: `dist-electron/${type}`,
            js: './'
        },
        filenameHash: false,
        cleanDistPath: true,
        sourceMap: false,
        minify: false
    }
    return config
}

const getElectronConfig = (type: "main" | "preload") => {
    const config: EnvironmentConfig = {
        source: {
            entry: {
                [type]: type === 'main' ? "./electron/main.ts" : "./electron/preload.ts"
            }
        },
        tools: {
            htmlPlugin: false,
            rspack: {
                target: type === 'main' ? "electron-main" : "electron-preload",
            }
        },
        output: getElectronOutput(type),
        performance: {
            chunkSplit: {
                strategy: "all-in-one"
            },
        },
        dev: {
            writeToDisk: true
        },
    }
    return config
}

export default defineConfig({
    environments: {
        "electron-main": getElectronConfig('main'),
        "electron-preload": getElectronConfig('preload'),
        "web": {
            plugins: [
                pluginVue(),
            ],
            source: {
                entry: {
                    home: "./src/index.ts",
                }
            },
            output: {
                assetPrefix: "../",
                distPath: {
                    html: 'pages',
                    css: 'static',
                    font: 'static',
                    image: 'static',
                    js: 'static',
                }
            },
            html: {
                template: "./template/index.html"
            },
            tools: {
                rspack: {
                    target: "web",
                    dependencies: ["electron-main", "electron-preload"]
                }
            },
        },
    },
})