import validatePipeSelection, { AssertionError } from "./inputValidator.js";

const OPTIONS = $("#options tr td");
const GRID = $("#grid tr td");

let currentlySelected = null;
let currentlyHoveringElement = null;

const pipeOrientation = {
  cross: 0,
  T: 0,
  straight: 0,
  L: 0,
};

/** The elements that the user has placed into the grid. */
const userDesign = {};

const disabledEdges = { columns: {}, rows: {} };
const enabledEdges = { columns: {}, rows: {} };

/** Sets the element's rotation in unit `grad`.
 *  E.g. 100grad = 90deg
 * 			 200grad = 180deg
 * 			 400grad = 360deg
 */
function setRotation(elem, forceAngle) {
  if (!elem) return;
  const angleInGrad = forceAngle ?? pipeOrientation[currentlySelected];
  elem.css("transform", `rotate(${angleInGrad}grad)`);
}

function selectPipeOption({ currentTarget }) {
  if (!currentTarget?.id) return;
  const clicked = currentTarget.id.split("-")[1];
  if (clicked === currentlySelected) {
    return void resetSelection();
  }
  resetSelection();
  currentlySelected = clicked;
  $("#" + currentTarget.id).addClass("selected");
}

function getImgElem(elemTarget) {
  const position = elemTarget?.id?.at(-1);
  if (!position) return;
  return $("#pipe-" + position);
}

/** Gets the image filename of the pipe element. Defaults to the currently selected element. */
function getImageFilename(elementName) {
  return `images/pipe-${elementName ?? currentlySelected}.png`;
}

/** Parses the filename and finds the raw element name. */
function getElementName(filename) {
  if (!filename) return;
  return filename.match(/images\/pipe-(\w+).png$/)[1];
}

/** Restores the cell where the 'ghost' pipe element is shown to its previous state. */
function removeHoverPreview(imgElem, position) {
  const previousSelection = userDesign[position];
  imgElem.css("opacity", "1");
  if (previousSelection) {
    imgElem.attr("src", getImageFilename(previousSelection.elementName));
    setRotation(imgElem, previousSelection.orientation);
  } else {
    imgElem.removeAttr("src");
  }
}

function hoverPipePosition({ target, currentTarget }, hoverOut) {
  const cellElement = $(target);
  const imgElem = getImgElem(currentTarget);
  if (!imgElem) return;

  if (hoverOut) {
    currentlyHoveringElement = null;
    cellElement.removeClass("bg-light");
    cellElement.addClass("bg-white");
    removeHoverPreview(imgElem, currentTarget.id);
    return;
  }
  cellElement.addClass("bg-light");
  cellElement.removeClass("bg-white");
  currentlyHoveringElement = imgElem;
  if (!currentlySelected || currentlySelected === "delete") {
    return;
  }
  imgElem.attr("src", getImageFilename());
  imgElem.css("opacity", "0.3");
  setRotation(imgElem);
}

/** Removes the rules that this position imposes if no other position also imposes them. */
function removePipeConditions(position) {
  // Iterate through the enabled and disabled rules set by this position
  for (const obj of [enabledEdges, disabledEdges]) {
    // Iterate through both the set column and row rules
    for (const property in obj) {
      // Iterate through the individual columns/rows that are imposed
      for (const attr in obj[property]) {
        // Iterate through each position that imposes this condition
        for (const pos of obj[property][attr]) {
          if (pos !== position) {
            continue;
          }
          // Remove the position from the array of positions imposing this condition
          obj[property][attr].splice(obj[property][attr].indexOf(pos), 1);
          // Remove the condition if no pipe element position imposes it
          // (Technically not needed but saves future memory and lookup speed)
          if (obj[property][attr].length === 0) {
            delete obj[property][attr];
          }
        }
      }
    }
  }
}

/** Event handler for when a grid position is clicked. */
function selectPipePosition({ currentTarget }) {
  const imgElem = getImgElem(currentTarget);
  if (!imgElem) return;
  if (!currentlySelected) {
    // User clicks grid element with no pipe option selected

    // const elementName = getElementName(imgElem.attr("src"));
    // if (elementName) {
    //   removePipeConditions(currentTarget.id);
    //   handleRotate(false, elementName);
    //   const orientation = pipeOrientation[elementName];
    //   try {
    //     validatePipeSelection(
    //       elementName,
    //       orientation,
    //       currentTarget.id,
    //       enabledEdges,
    //       disabledEdges
    //     );
    //   } catch (e) {
    //     if (!(e instanceof AssertionError)) {
    //       throw e;
    //     }
    //     errorAnimation($(currentTarget), "invalid-edge-" + e.assertedEdge);
    //     return;
    //   }
    //   userDesign[currentTarget.id].orientation = pipeOrientation[elementName];
    // }
    return;
  }
  if (currentlySelected === "delete") {
    if (userDesign[currentTarget.id]) {
      delete userDesign[currentTarget.id];
      imgElem.removeAttr("src");
      removePipeConditions(currentTarget.id);
    }
    return;
  }
  const orientation = pipeOrientation[currentlySelected];
  if (userDesign[currentTarget.id]) {
    removePipeConditions(currentTarget.id);
  }
  try {
    validatePipeSelection(
      currentlySelected,
      orientation,
      currentTarget.id,
      enabledEdges,
      disabledEdges
    );
  } catch (e) {
    if (!(e instanceof AssertionError)) {
      throw e;
    }
    errorAnimation($(currentTarget), "invalid-edge-" + e.assertedEdge);
    return;
  }

  imgElem.attr("src", getImageFilename());
  imgElem.css("opacity", "1");
  setRotation(imgElem, orientation);
  userDesign[currentTarget.id] = {
    elementName: currentlySelected,
    orientation,
  };
}

/** Makes the edge flash red the specified number of times. */
function errorAnimation(element, className, numFlashes = 2) {
  function flash() {
    element.toggleClass(className);
  }

  // Iterate twice for each flash; turn red and revert back.
  for (let stage = 0; stage < numFlashes * 2; stage++) {
    // 250 ms interval total between each flash sequence
    setTimeout(flash, stage * 125);
  }
}

function resetSelection(event) {
  if (event) {
    // Don't reset the selection if a table element is clicked
    if (event.currentTarget !== event.target && event.target.id !== "root") {
      return;
    }
  }
  if (currentlyHoveringElement) {
    const id = currentlyHoveringElement.attr("id");
    const position = "position-" + id.split("-")[1];
    removeHoverPreview(currentlyHoveringElement, position);
  }
  currentlySelected = null;
  OPTIONS.removeClass("selected");
}

function getEventKey(e) {
  const key = e?.originalEvent?.key;
  return key;
}

function handleRotate(shiftIsHeld = false, optionOverride) {
  if (optionOverride === undefined) optionOverride = currentlySelected;
  if (!optionOverride) return;
  let orientation = pipeOrientation[optionOverride];
  if (shiftIsHeld) {
    // Rotate in opposite direction if user holding the shift key
    orientation -= 100;
    if (orientation < 0) {
      orientation = 300;
    }
  } else {
    orientation += 100;
    if (orientation > 300) {
      orientation = 0;
    }
  }
  pipeOrientation[optionOverride] = orientation;
  const elem = $("#option-" + optionOverride);
  setRotation(elem, orientation);
  if (currentlyHoveringElement) {
    // Update the pipe option preview if hovering over the grid
    setRotation(currentlyHoveringElement, orientation);
    if (currentlySelected) {
      currentlyHoveringElement.css("opacity", "0.3");
    }
  }
}

function handleKeyDown(e) {
  const key = getEventKey(e);
  switch (key) {
    case "Escape":
      resetSelection();
      return;
    case "r":
      handleRotate();
      return;
    case "R":
      handleRotate(true);
      return;
    // case " ":
    //   console.log("Enabled rows:", enabledEdges.rows);
    //   console.log("Enabled columns:", enabledEdges.columns);
    //   console.log("Disabled rows:", disabledEdges.rows);
    //   console.log("Disabled columns:", disabledEdges.columns);
    //   console.log();
    //   break;
    default:
      console.log(`Pressed key '${key}'`);
      return;
  }
}

OPTIONS.click(selectPipeOption);
GRID.click(selectPipePosition).hover(
  (event) => hoverPipePosition(event, false),
  (event) => hoverPipePosition(event, true)
);
$(document).click(resetSelection).keydown(handleKeyDown);
