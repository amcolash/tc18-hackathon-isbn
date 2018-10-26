'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

require('styles//List.css');

class ListComponent extends React.Component {
  makeButton (sheetName) {
    return (
      <Button key={sheetName} bsStyle='default' block
        onClick={() => this.props.onSelectValue(sheetName)}>
        {sheetName}
      </Button>
    );
  }

  render () {
    const buttons = this.props.values.map(value => this.makeButton(value));
    return (
      <div>
        {buttons}
      </div>
    );
  }
}

ListComponent.displayName = 'ListComponent';

ListComponent.propTypes = {
  onSelectValue: PropTypes.func,
  values: PropTypes.array
};

export default ListComponent;
