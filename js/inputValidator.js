const NON_CONNECTIVE_EDGES = {
  cross: [],
  T: [0],
  straight: [0, 2],
  L: [0, 1],
};

export class AssertionError extends Error {
  constructor(isRequired, rowOrColumn, assertedEdge) {
    super(
      `${
        isRequired ? "Required" : "Disabled"
      } ${rowOrColumn}: edge ${assertedEdge}.`
    );
    this.name = "AssertionError";
    this.assertedEdge = assertedEdge;
  }
}

export default function validatePipeSelection(
  elementName,
  orientation,
  elementPosition,
  enabledEdges,
  disabledEdges
) {
  function assertState(value, isColumn, enabled, assertedEdge) {
    let rowOrColumn = "row";
    let objToCompareAgainst;
    let arrayToModify;
    if (isColumn) {
      rowOrColumn = "column";
      if (enabled) {
        objToCompareAgainst = disabledEdges.columns;
        arrayToModify = enabledColumns;
      } else {
        objToCompareAgainst = enabledEdges.columns;
        arrayToModify = disabledColumns;
      }
    } else {
      if (enabled) {
        objToCompareAgainst = disabledEdges.rows;
        arrayToModify = enabledRows;
      } else {
        objToCompareAgainst = enabledEdges.rows;
        arrayToModify = disabledRows;
      }
    }
    const positionsArray = objToCompareAgainst[value];
    if (
      positionsArray?.length > 1 ||
      (positionsArray?.length === 1 && positionsArray[0] !== elementPosition)
    )
      throw new AssertionError(!enabled, rowOrColumn, assertedEdge);

    arrayToModify.push(value);
  }

  const position = parseInt(elementPosition.split("-")[1]);
  // Account for the element's rotation
  const relativeEdges = NON_CONNECTIVE_EDGES[elementName].map(
    (edge) => (edge + orientation / 100) % 4
  );
  const disabledRows = [];
  const disabledColumns = [];

  const enabledRows = [];
  const enabledColumns = [];

  // Make the column data format more intuitive, 1-6 instead of 1, 2 | 4, 5 | 7, 8
  const columnOffset = Math.floor((position - 1) / 3);

  // Top edge disabled
  if (position > 3) {
    if (relativeEdges.includes(0)) {
      assertState(position - 3, false, false, 0);
    } else {
      assertState(position - 3, false, true, 0);
    }
  }

  // Right edge disabled
  if (position % 3 !== 0) {
    if (relativeEdges.includes(1))
      assertState(position - columnOffset, true, false, 1);
    else {
      assertState(position - columnOffset, true, true, 1);
    }
  }

  // Bottom edge disabled
  if (position < 7) {
    if (relativeEdges.includes(2)) {
      assertState(position, false, false, 2);
    } else {
      assertState(position, false, true, 2);
    }
  }

  // Left edge disabled
  if (position % 3 !== 1) {
    if (relativeEdges.includes(3)) {
      assertState(position - 1 - columnOffset, true, false, 3);
    } else {
      assertState(position - 1 - columnOffset, true, true, 3);
    }
  }

  // console.log("Enabled rows:", enabledRows);
  // console.log("Enabled columns:", enabledColumns);
  // console.log("Disabled rows:", disabledRows);
  // console.log("Disabled columns:", disabledColumns);

  // return {
  //   disabled: { rows: disabledRows, columns: disabledColumns },
  //   enabled: { rows: enabledRows, columns: enabledColumns },
  // };

  // Merge the row and column rules
  for (const [obj, values] of [
    [enabledEdges, { rows: enabledRows, columns: enabledColumns }],
    [disabledEdges, { rows: disabledRows, columns: disabledColumns }],
  ]) {
    for (const property in values) {
      for (const attr of values[property]) {
        if (obj[property][attr]) {
          if (obj[property][attr].includes(elementPosition)) {
            continue;
          }
        } else {
          obj[property][attr] = [];
        }
        obj[property][attr].push(elementPosition);
      }
    }
  }
}
