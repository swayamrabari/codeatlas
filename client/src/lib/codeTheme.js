import { themes } from 'prism-react-renderer';

export const codeTheme = {
  // keep all of vsDark's plain background + text
  ...themes.vsDark,

  // append your overrides at the END of styles array
  // (later entries win over earlier ones)
  styles: [
    ...themes.vsDark.styles,
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: {
        color: '#ffffff90', // grey — change this to any shade you like
      },
    },
    {
      types: ['constant', 'symbol'],
      style: {
        color: '#e5c07b', // golden yellow — change to whatever you like
      },
    },
  ],
};
