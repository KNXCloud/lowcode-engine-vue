import { defineComponent } from 'vue';

const Leaf = defineComponent({
  name: 'Leaf',
  render() {
    return this.$slots.default?.();
  },
});

Object.assign(Leaf, {
  displayName: 'Leaf',
  componentMetadata: {
    componentName: 'Leaf',
    configure: {
      props: [
        {
          name: 'children',
          setter: 'StringSetter',
        },
      ],
      supports: false,
    },
  },
});

export default Leaf;
