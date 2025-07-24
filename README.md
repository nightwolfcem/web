# Web Project

This repository hosts experimental UI work located under `gridprj`. The
main development happens in the `files/src` folder which now contains a
structured source hierarchy:

```
files/src
├── asset           # static assets such as icon definitions
├── core            # base classes and utility modules
├── data            # sample data used by the UI
├── db              # database constants
├── dom             # DOM related utilities and components
├── intl            # i18n helpers
├── prototypes      # prototype extensions
├── ui              # user interface widgets
├── utils           # general utilities
└── main.js         # entry point that wires everything together
```

The `grild` directory holds HTML demos that load scripts from `files/src`.
You can simply open one of these files (for example `gridprj/grild/grid.html`)
in a modern browser to run the project. No additional build step is required
as the code consists of plain JavaScript modules.
