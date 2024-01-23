import React from "react";

export type TocProvider = (htmlElement: string) => string;

export const DefaultTocProvider = () => {
  const startingValue = 1;
  const elementHierarchy: { [key: string]: number; } = {
    "": 0,
    "h1": 1,
    "h2": 2,
    "h3": 3,
    "h4": 4,
    "h5": 5,
    "h6": 6,
    "p": 7
  };

  let lastElementType = "";
  let currentValue: number[] = [];

  const updateToc = (htmlElementType: string): string => {
    let currentElementValue = elementHierarchy[htmlElementType];
    let lastElementValue = elementHierarchy[lastElementType];

    if (currentElementValue > lastElementValue) {
      currentValue.push(startingValue);
    } else if (currentElementValue === lastElementValue) {
      currentValue[currentValue.length - 1] = currentValue[currentValue.length - 1] + 1;
    } else if (currentElementValue < lastElementValue) {
      let amountToRemove = lastElementValue - currentElementValue - 1;
      currentValue.splice(currentValue.length - amountToRemove, amountToRemove);
      currentValue[currentValue.length - 1] = currentValue[currentValue.length - 1] + 1;
    }

    lastElementType = htmlElementType;
    return currentValue.join(".");
  };

  return updateToc;
};

export const TocContext = React.createContext(DefaultTocProvider());