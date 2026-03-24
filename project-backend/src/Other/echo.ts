// Do not delete this file
function echo(value: string): string {
  const value1 = {
    echo: value,
  };
  if (value1.echo && value1.echo === 'echo') {
    // Return a descriptive error message for easy debugging
    throw new Error('Cannot echo an object with the property \'echo\'.');
  }
  return value1.echo;
}

export { echo };
