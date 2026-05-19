# Config-Driven Swoff System

The config-driven system allows you to configure Swoff behavior through a simple JSON configuration file instead of writing custom service worker code. This approach provides easier setup while maintaining full flexibility for customization.

## Quick Start

### 1. Create Configuration File

Copy the example configuration to your project root:

```bash
cp examples/shared/swoff.config.example.json swoff.config.json
```

### 2. Customize Your Configuration

Edit `swoff.config.json` to match your app's needs:

```json
{
  "$schema": "https://swoff.ai/schema/v1.json",
  "enabled": true,
  "version": "from-package",
  "minSupportedVersion": "1.0.0",
  "serviceWorker": {
    "autoUpdate": false,
    "defaultStrategy": "cache-first",
    "strategies": {
      "/api/*": "network-first",
      "/static/*": "cache-first"
    }
  },
  "features": {
    "offlineReads": true,
    "mutationQueue": true,
    "pwa": true
  }
}
```

### 3. Build Your Service Worker

Run the generator:

```bash
node examples/shared/sw-generator.js
```

This will generate a service worker in `dist/sw-v{version}.js`.

## Configuration Options

### Basic Configuration

```json
{
  "enabled": true,
  "version": "from-package", // or "1.2.3"
  "minSupportedVersion": "1.0.0"
}
```

### Service Worker Configuration

```json
{
  "serviceWorker": {
    "autoUpdate": false,
    "defaultStrategy": "cache-first",
    "strategies": {
      "/api/*": "network-first",
      "/static/*": "cache-first",
      "/*": "cache-first"
    },
    "maxCacheEntries": 200,
    "maxCacheAge": 86400000,
    "runtimeCacheName": "my-app-cache"
  }
}
```

### Available Cache Strategies

- **cache-first**: Return cached version, then fetch from network
- **network-first**: Try network first, then cache on success
- **stale-while-revalidate**: Return cached version, fetch update in background
- **cache-only**: Only return cached versions
- **network-only**: Always fetch from network

### Feature Toggles

```json
{
  "features": {
    "versionedSw": true,
    "offlineReads": true,
    "mutationQueue": true,
    "backgroundSync": false,
    "pwa": true,
    "auth": false,
    "crossTabSync": true,
    "tagInvalidation": true
  }
}
```

### Database Configuration

```json
{
  "database": {
    "name": "my-app-db",
    "stores": ["users", "posts", "comments", "settings"]
  }
}
```

### Build Configuration

```json
{
  "build": {
    "outputDir": "dist",
    "swFilename": "sw"
  }
}
```

## Generated Service Worker

The generated service worker includes:

### Self-Documentation

The generated file is heavily commented with:
- Configuration summary
- Feature explanations
- Strategy documentation
- Usage examples

### Key Features

1. **Smart Caching**: Implements the configured cache strategies
2. **Version Management**: Handles service worker updates correctly
3. **Offline Support**: Caches assets and responses for offline access
4. **Error Handling**: Graceful fallbacks for network failures
5. **Performance**: Optimized for both speed and reliability

### Custom Code Mode

If you need to write custom code, simply set `"enabled": false` in your config:

```json
{
  "enabled": false
}
```

This will disable generation and you can write your own service worker manually.

## PWA Integration

Swoff focuses on service worker and offline functionality. For PWA setup, you'll need to create your own `manifest.json`:

```json
// public/manifest.json
{
  "name": "My App",
  "short_name": "MyApp",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512", 
      "type": "image/png"
    }
  ]
}
```

### Manifest Fields Reference

For a complete list of manifest fields, see the [Web App Manifest specification](https://developer.mozilla.org/en-US/docs/Web/Manifest).

## Migration from Manual Coding

If you're currently using manual service worker code:

1. **Create config file** with your current settings
2. **Set `"enabled": true`** to start using config generation
3. **Test the generated service worker** to ensure it works the same
4. **Gradually migrate** features from custom code to config
5. **Eventually set `"enabled": false"`** only if you need full customization

## Configuration File Types

Swoff supports multiple configuration file types (in order of preference):

1. **swoff.config.json** - Recommended (JSON, type-agnostic)
2. **swoff.config.js** - JavaScript/TypeScript fallback
3. **swoff.config.mjs** - ES Module fallback
4. **swoff.config.cjs** - CommonJS fallback

## Best Practices

### Configuration Tips

1. **Start simple**: Begin with basic caching strategies
2. **Test thoroughly**: Test each strategy with your specific content
3. **Monitor performance**: Use browser DevTools to cache performance
4. **Update gradually**: Enable features one at a time

### Cache Strategy Recommendations

- **API calls**: Use `network-first` for real-time data
- **Static assets**: Use `cache-first` for fast loading
- **Images**: Use `stale-while-revalidate` for better performance
- **Critical files**: Use `cache-first` with offline fallback

### Version Management

- **minSupportedVersion**: Set this to force updates for older versions
- **version**: Use `"from-package"` to auto-update with your app version
- **Versioned SW**: Keep this enabled for proper update handling

## Troubleshooting

### Common Issues

1. **Service worker not updating**: Check version numbers and cache clearing
2. **Caching not working**: Verify cache strategies match your URL patterns
3. **Build errors**: Ensure all config options are valid JSON
4. **Config not loading**: Check file path and JSON syntax

### Debugging Tips

1. **Use DevTools**: Service workers tab shows registration and events
2. **Check console**: Look for warning and error messages
3. **Test offline**: Use DevTools to simulate offline mode
4. **Validate JSON**: Use a JSON validator to check syntax

### Configuration Validation

Swoff validates configuration against the JSON schema. Common errors:

- **Invalid JSON syntax**: Check for missing commas or quotes
- **Unknown properties**: Remove fields not in the schema
- **Wrong data types**: Ensure booleans are `true`/false`, not strings
- **Invalid patterns**: Check URL patterns and cache strategies

## Advanced Usage

### Environment-Specific Configs

Create different configs for different environments:

```bash
# swoff.config.development.json
{
  "enabled": true,
  "serviceWorker": {
    "defaultStrategy": "network-first"
  }
}

# swoff.config.production.json  
{
  "enabled": true,
  "serviceWorker": {
    "defaultStrategy": "cache-first"
  }
}
```

### Schema Reference

For a complete schema reference, see the [JSON schema](https://swoff.ai/schema/v1.json) or the [schema documentation](configuration/schema-reference.md).

### Integration with Build Tools

The generator can be integrated into your build process:

```javascript
// In your build script
import { generateServiceWorker } from './examples/shared/sw-generator.js';

// Generate as part of your build process
await generateServiceWorker();
```

### 2. Customize Your Configuration

Edit `swoff.config.js` to match your app's needs:

```javascript
export default {
  enabled: true,
  version: "from-package",
  serviceWorker: {
    defaultStrategy: "cache-first",
    strategies: {
      "/api/*": "network-first",
      "/static/*": "cache-first"
    }
  },
  features: {
    offlineReads: true,
    mutationQueue: true,
    pwa: true
  },
  pwa: {
    name: "My App",
    shortName: "MyApp",
    themeColor: "#2563eb"
  }
};
```

### 3. Build Your Service Worker

Run the generator:

```bash
node examples/shared/sw-generator.js
```

This will generate a service worker in `dist/sw-v{version}.js`.

## Configuration Options

### Basic Configuration

```javascript
{
  // Enable/disable config generation
  enabled: true,
  
  // Service Worker version
  version: "from-package", // or "1.2.3"
  
  // Minimum supported version for forced updates
  minSupportedVersion: "1.0.0"
}
```

### Service Worker Configuration

```javascript
{
  serviceWorker: {
    // Auto-update behavior
    autoUpdate: false,
    
    // Default caching strategy
    defaultStrategy: "cache-first",
    
    // Custom strategies per URL pattern
    strategies: {
      "/api/*": "network-first",
      "/static/*": "cache-first",
      "/*": "cache-first"
    },
    
    // Cache limits
    maxCacheEntries: 200,
    maxCacheAge: 86400000, // 24 hours in ms
    runtimeCacheName: "my-app-cache"
  }
}
```

### Available Cache Strategies

- **cache-first**: Return cached version, then fetch from network
- **network-first**: Try network first, then cache on success
- **stale-while-revalidate**: Return cached version, fetch update in background
- **cache-only**: Only return cached versions
- **network-only**: Always fetch from network

### Feature Toggles

```javascript
{
  features: {
    // Version management
    versionedSw: true,
    
    // Offline functionality
    offlineReads: true,
    mutationQueue: true,
    
    // Advanced features
    backgroundSync: false, // Chrome/Edge only
    pwa: true,
    auth: false,
    crossTabSync: true,
    tagInvalidation: true
  }
}
```

### PWA Configuration

```javascript
{
  pwa: {
    name: "My Awesome App",
    shortName: "MyApp",
    themeColor: "#2563eb",
    backgroundColor: "#ffffff",
    icons: [192, 512],
    startUrl: "/",
    display: "standalone",
    description: "A progressive web application"
  }
}
```

### Build Configuration

```javascript
{
  build: {
    outputDir: "dist",
    swFilename: "sw"
  }
}
```

## Generated Service Worker

The generated service worker includes:

### Self-Documentation

The generated file is heavily commented with:
- Configuration summary
- Feature explanations
- Strategy documentation
- Usage examples

### Key Features

1. **Smart Caching**: Implements the configured cache strategies
2. **Version Management**: Handles service worker updates correctly
3. **Offline Support**: Caches assets and responses for offline access
4. **Error Handling**: Graceful fallbacks for network failures
5. **Performance**: Optimized for both speed and reliability

### Custom Code Mode

If you need to write custom code, simply set `enabled: false` in your config:

```javascript
{
  enabled: false
}
```

This will disable generation and you can write your own service worker manually.

## Migration from Manual Coding

If you're currently using manual service worker code:

1. **Create config file** with your current settings
2. **Set `enabled: true`** to start using config generation
3. **Test the generated service worker** to ensure it works the same
4. **Gradually migrate** features from custom code to config
5. **Eventually set `enabled: false`** only if you need full customization

## Best Practices

### Configuration Tips

1. **Start simple**: Begin with basic caching strategies
2. **Test thoroughly**: Test each strategy with your specific content
3. **Monitor performance**: Use browser DevTools to cache performance
4. **Update gradually**: Enable features one at a time

### Cache Strategy Recommendations

- **API calls**: Use `network-first` for real-time data
- **Static assets**: Use `cache-first` for fast loading
- **Images**: Use `stale-while-revalidate` for better performance
- **Critical files**: Use `cache-first` with offline fallback

### PWA Considerations

- **Manifest**: Ensure your PWA manifest matches the config
- **Icons**: Include all required icon sizes
- **Theme color**: Choose a color that matches your brand
- **Offline support**: Test offline functionality thoroughly

## Troubleshooting

### Common Issues

1. **Service worker not updating**: Check version numbers and cache clearing
2. **Caching not working**: Verify cache strategies match your URL patterns
3. **PWA not installing**: Check manifest configuration and service worker scope
4. **Build errors**: Ensure all config options are valid

### Debugging Tips

1. **Use DevTools**: Service workers tab shows registration and events
2. **Check console**: Look for warning and error messages
3. **Test offline**: Use DevTools to simulate offline mode
4. **Clear cache**: Use DevTools to clear service worker cache

## Advanced Usage

### Custom Strategies

You can implement custom cache strategies by:

1. **Extending the template**: Add custom strategy functions
2. **Using the API**: Access SWOFF utilities in your custom code
3. **Combining approaches**: Use config for basic setup, custom code for advanced features

### Integration with Build Tools

The generator can be integrated into your build process:

```javascript
// In your build script
import { generateServiceWorker } from './examples/shared/sw-generator.js';

// Generate as part of your build process
await generateServiceWorker();
```

### Environment-Specific Configs

Create different configs for different environments:

```javascript
// swoff.config.development.js
export default {
  enabled: true,
  serviceWorker: {
    defaultStrategy: "network-first" // More aggressive caching in dev
  }
};

// swoff.config.production.js  
export default {
  enabled: true,
  serviceWorker: {
    defaultStrategy: "cache-first" // Better performance in production
  }
};
```