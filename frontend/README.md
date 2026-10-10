# frontend

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).



### Test PWA

**Chrome Browser:**

- chrome://flags/#unsafely-treat-insecure-origin-as-secure
- Ennable: Insecure origins treated as secure
- Add correct TLS domain: https://10.220.119.88

`cd ./dist && caddy file-server --listen :443 --domain 10.220.119.88`
