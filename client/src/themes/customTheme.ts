import type { PrismTheme } from 'prism-react-renderer';

const theme: PrismTheme = {
  plain: {
    backgroundColor: '#0d1217', // colors.editor.background
    color: '#abb2bf', // colors.editor.foreground
    textShadow: '0 1px rgba(0, 0, 0, 0.3)',
  },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: {
        color: '#7F848E', // comment
        fontStyle: 'italic',
      },
    },
    {
      types: ['punctuation'],
      style: {
        color: '#abb2bf', // punctuation.separator
      },
    },
    {
      types: [
        'property',
        'tag',
        'boolean',
        'number',
        'constant',
        'symbol',
        'deleted',
      ],
      style: {
        color: '#D19A66', // constant.numeric, entity.other.attribute-name
      },
    },
    {
      types: ['selector', 'attr-name', 'string', 'char', 'builtin', 'inserted'],
      style: {
        color: '#98C379', // string
      },
    },
    {
      types: ['variable'],
      style: {
        color: '#E06C75', // variable
      },
    },
    {
      types: ['operator', 'entity', 'url'],
      style: {
        color: '#56B6C2', // keyword.operator.logical, support.type
      },
    },
    {
      types: ['atrule', 'attr-value', 'keyword'],
      style: {
        color: '#C678DD', // keyword
      },
    },
    {
      types: ['function'],
      style: {
        color: '#61AFEF', // entity.name.function
      },
    },
    {
      types: ['class-name', 'maybe-class-name'],
      style: {
        color: '#E5C07B', // entity.name.class
      },
    },
    {
      types: ['regex', 'important'],
      style: {
        color: '#E06C75', // string.regexp
      },
    },
    // Specific overrides for HTML/JSX tags to match Atomify Red
    {
      types: ['tag'],
      style: {
        color: '#E06C75', // entity.name.tag
      },
    },
    // Specific overrides for Attributes/Props to match Atomify Orange
    {
      types: ['attr-name'],
      style: {
        color: '#D19A66', // entity.other.attribute-name
      },
    },
    {
      types: ['important', 'bold'],
      style: {
        fontWeight: 'bold',
      },
    },
    {
      types: ['italic'],
      style: {
        fontStyle: 'italic',
      },
    },
  ],
};

export default theme;
