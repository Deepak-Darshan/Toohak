// Do not delete this file
function echo(value: string): { value: string } {
  if (value === 'echo') {
    throw new Error('You cannot echo the word echo itself');
  }
  return {
    value,
  };
}

export { echo };
