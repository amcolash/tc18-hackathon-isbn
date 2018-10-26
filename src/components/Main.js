import React from 'react';
import { Button, Glyphicon, Modal } from 'react-bootstrap';
import axios from 'axios';

import LoadingIndicatorComponent from './LoadingIndicatorComponent';
import ListComponent from './ListComponent';

require('normalize.css/normalize.css');
require('styles/App.css');

// Declare this so our linter knows that tableau is a global object
/* global tableau */

class AppComponent extends React.Component {
  constructor (props) {
    super(props);
    this.state = {
      isLoading: true,
      selectedSheet: undefined,
      selectedValue: undefined,
      sheetNames: [],
      valueNames: [],
      rows: [],
      headers: [],
      dataKey: 1,
      dashboardName: '',
      requestData: undefined
    };

    this.unregisterEventFn = undefined;
  }

  componentWillMount () {
    tableau.extensions.initializeAsync().then(() => {
      const selectedSheet = tableau.extensions.settings.get('sheet');
      const selectedValue = tableau.extensions.settings.get('value');
      const sheetNames = tableau.extensions.dashboardContent.dashboard.worksheets.map(worksheet => worksheet.name);
      const dashboardName = tableau.extensions.dashboardContent.dashboard.name;
      const sheetSelected = !!selectedSheet;
      this.setState({
        isLoading: sheetSelected,
        selectedSheet: selectedSheet,
        selectedValue: selectedValue,
        sheetNames: sheetNames,
        dashboardName: dashboardName
      });

      if (sheetSelected) {
        this.loadSelectedMarks();
      }
    });
  }

  getSelectedSheet (selectedSheet) {
    const sheetName = selectedSheet || this.state.selectedSheet;
    return tableau.extensions.dashboardContent.dashboard.worksheets.find(worksheet => worksheet.name === sheetName);
  }

  onSelectSheet (sheetName) {
    tableau.extensions.settings.set('sheet', sheetName);
    this.setState({ isLoading: true });
    tableau.extensions.settings.saveAsync().then(() => {
      this.setState({ selectedSheet: sheetName }, this.loadSelectedMarks.bind(this));
    });
  }

  onSelectValue (value) {
    tableau.extensions.settings.set('value', value);
    this.setState({ isLoading: true });
    tableau.extensions.settings.saveAsync().then(() => {
      this.setState({ selectedValue: value }, this.loadSelectedMarks.bind(this));
    });
  }

  getRowValue(rows, headers) {
    if (rows.length !== 1) return; // Prevent issues with more than one selection
    const valueIndex = headers.findIndex(header => header === this.state.selectedValue);
    return rows[0][valueIndex];
  }

  loadSelectedMarks () {
    if (this.unregisterEventFn) {
      this.unregisterEventFn();
    }

    const worksheet = this.getSelectedSheet();
    worksheet.getSelectedMarksAsync().then(marks => {
      // Get the first DataTable for our selected marks (usually there is just one)
      const worksheetData = marks.data[0];

      // Map our data into the format which the data table component expects it
      const rows = worksheetData.data.map(row => row.map(cell => cell.formattedValue));
      const headers = worksheetData.columns.map(column => column.fieldName);

      if (this.state.selectedValue && rows.length === 1) {
        axios.get('https://openlibrary.org/api/books?jscmd=data&&format=json&bibkeys=ISBN:' + this.getRowValue(rows, headers), { timeout: 10000 }).then((response) => {
          const responseData = response.data;
          console.log(response);
          const data = responseData[Object.keys(responseData)[0]];
          this.updateState(rows, headers, data);
        }).catch((error) => {
          console.error(error);
          this.updateState(rows, headers, undefined);
        });
      } else {
        this.updateState(rows, headers, undefined);
      }
    });

    this.unregisterEventFn = worksheet.addEventListener(tableau.TableauEventType.MarkSelectionChanged, () => {
      this.setState({ isLoading: true });
      this.loadSelectedMarks();
    });
  }

  updateState(rows, headers, data) {
    this.setState({
      rows: rows,
      headers: headers,
      dataKey: Date.now(),
      requestData: data,
      isLoading: false
    });

    this.forceUpdate();
  }

  render () {
    if (this.state.isLoading) {
      return (<LoadingIndicatorComponent msg='Loading' />);
    }

    if (!this.state.selectedSheet) {
      return (
        <Modal show>
          <Modal.Header>
            <Modal.Title>Choose a Sheet from <span className='sheet_name'>{this.state.dashboardName}</span></Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ListComponent values={this.state.sheetNames} onSelectValue={this.onSelectSheet.bind(this)} />
          </Modal.Body>
        </Modal>);
    }

    if (!this.state.selectedValue) {
      if (this.state.headers.length === 0) {
        return (
        <Modal show>
          <Modal.Header>
            <Modal.Title>Please Select A Mark</Modal.Title>
          </Modal.Header>
        </Modal>);
      }

      return (
      <Modal show>
        <Modal.Header>
          <Modal.Title>Choose a value to display</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ListComponent values={this.state.headers} onSelectValue={this.onSelectValue.bind(this)} />
        </Modal.Body>
      </Modal>);
    }

    const requestData = this.state.requestData;
    return (
      <div>
        {/* <Button bsStyle='link' onClick={() => this.setState({ selectedSheet: undefined, selectedValue: undefined, requestData: undefined })}><Glyphicon glyph='cog' /></Button> */}
        {requestData ? (
          <div>
            <span>{JSON.stringify(requestData)}</span>
            <h3>{requestData.title}</h3>
            {requestData.cover ? (
              <img src={requestData.cover.large}/>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }
}

export default AppComponent;
