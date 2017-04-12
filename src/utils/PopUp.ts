import { $$, IOffset } from './Dom';
import { Utils } from './Utils';
import { InitializationEvents } from '../events/InitializationEvents';
import { Assert } from '../misc/Assert';

export interface IPosition {
  vertical: VerticalAlignment;
  horizontal: HorizontalAlignment;
  verticalOffset?: number;
  horizontalOffset?: number;
  horizontalClip?: boolean;
}

export enum VerticalAlignment {
  TOP,
  MIDDLE,
  BOTTOM,
  INNERTOP,
  INNERBOTTOM
}

export enum HorizontalAlignment {
  LEFT,
  CENTER,
  RIGHT,
  INNERLEFT,
  INNERRIGHT
}

interface IElementBoundary {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export class PopUp {

  private documentClickListener: EventListener;

  constructor(public popUp: HTMLElement, private coveoRoot: HTMLElement, private popUpCloseButton?: HTMLElement, private onCloseCallback?: Function, private manageCloseEvent = true) {
    if (!popUpCloseButton && manageCloseEvent) {
      Assert.fail('In PopUp, should give a popUpCloseButton when manageCloseEvent is true.');
    }

    $$(this.coveoRoot).on(InitializationEvents.nuke, () => {
      if (this.documentClickListener) {
        $$(document.documentElement).off('click', this.documentClickListener);
      }
    });
  }

  public positionPopup(nextTo: HTMLElement, boundary: HTMLElement, desiredPosition: IPosition, appendTo?: HTMLElement, checkForBoundary = 0) {

    if (this.manageCloseEvent) {
      this.bindCloseEvent();
    }
    this.popUp.style.position = 'absolute';
    if (appendTo) {
      $$(appendTo).append(this.popUp);
    }
    desiredPosition.verticalOffset = desiredPosition.verticalOffset ? desiredPosition.verticalOffset : 0;
    desiredPosition.horizontalOffset = desiredPosition.horizontalOffset ? desiredPosition.horizontalOffset : 0;

    let popUpPosition = $$(nextTo).offset();
    this.basicVerticalAlignment(popUpPosition, this.popUp, nextTo, desiredPosition);
    this.basicHorizontalAlignment(popUpPosition, this.popUp, nextTo, desiredPosition);
    this.finalAdjustement($$(this.popUp).offset(), popUpPosition, this.popUp, desiredPosition);

    let popUpBoundary = this.getBoundary(this.popUp);
    let boundaryPosition = this.getBoundary(boundary);
    if (checkForBoundary < 2) {
      let checkBoundary = this.checkForOutOfBoundary(popUpBoundary, boundaryPosition);
      if (checkBoundary.horizontal != 'ok' && desiredPosition.horizontalClip === true) {
        let width = this.popUp.offsetWidth;
        if (popUpBoundary.left < boundaryPosition.left) {
          width -= boundaryPosition.left - popUpBoundary.left;
        }
        if (popUpBoundary.right > boundaryPosition.right) {
          width -= popUpBoundary.right - boundaryPosition.right;
        }
        this.popUp.style.width = width + 'px';
        checkBoundary.horizontal = 'ok';
      }
      if (checkBoundary.vertical != 'ok' || checkBoundary.horizontal != 'ok') {
        let newDesiredPosition = this.alignInsideBoundary(desiredPosition, checkBoundary);
        this.positionPopup(nextTo, boundary, newDesiredPosition, appendTo, checkForBoundary + 1);
      }
    }
  }

  private bindCloseEvent() {
    this.documentClickListener = event => {
      if (Utils.isHtmlElement(event.target)) {
        let eventTarget = $$(<HTMLElement>event.target);
        if (!eventTarget.isDescendant(this.popUpCloseButton) && !eventTarget.isDescendant(this.popUp)) {
          $$(this.popUp).detach();
          this.onCloseCallback && this.onCloseCallback();
        }
      }
    };
    $$(document.documentElement).on('click', this.documentClickListener);
  }


  private finalAdjustement(popUpOffSet: IOffset, popUpPosition: IOffset, popUp: HTMLElement, desiredPosition: IPosition) {
    let position = $$(popUp).position();
    popUp.style.top = (position.top + desiredPosition.verticalOffset) - (popUpOffSet.top - popUpPosition.top) + 'px';
    popUp.style.left = (position.left + desiredPosition.horizontalOffset) - (popUpOffSet.left - popUpPosition.left) + 'px';
  }

  private basicVerticalAlignment(popUpPosition: IOffset, popUp: HTMLElement, nextTo: HTMLElement, desiredPosition: IPosition) {
    switch (desiredPosition.vertical) {
      case VerticalAlignment.TOP:
        popUpPosition.top -= popUp.offsetHeight;
        break;
      case VerticalAlignment.BOTTOM:
        popUpPosition.top += nextTo.offsetHeight;
        break;
      case VerticalAlignment.MIDDLE:
        popUpPosition.top -= popUp.offsetHeight / 3;
      case VerticalAlignment.INNERTOP:
        break; // Nothing to do, it's the default alignment normally
      case VerticalAlignment.INNERBOTTOM:
        popUpPosition.top -= popUp.offsetHeight - nextTo.offsetHeight;
        break;
      default:
        break;
    }
  }

  private basicHorizontalAlignment(popUpPosition: IOffset, popUp: HTMLElement, nextTo: HTMLElement, desiredPosition: IPosition) {
    switch (desiredPosition.horizontal) {
      case HorizontalAlignment.LEFT:
        popUpPosition.left -= popUp.offsetWidth;
        break;
      case HorizontalAlignment.RIGHT:
        popUpPosition.left += nextTo.offsetWidth;
        break;
      case HorizontalAlignment.CENTER:
        popUpPosition.left += this.offSetToAlignCenter(popUp, nextTo);
        break;
      case HorizontalAlignment.INNERLEFT:
        break; // Nothing to do, it's the default alignment normally
      case HorizontalAlignment.INNERRIGHT:
        popUpPosition.left -= popUp.offsetWidth - nextTo.offsetWidth;
        break;
      default:
        break;
    }
  }

  private alignInsideBoundary(oldPosition: IPosition, checkBoundary) {
    let newDesiredPosition = oldPosition;
    if (checkBoundary.horizontal == 'left') {
      newDesiredPosition.horizontal = HorizontalAlignment.RIGHT;
    }
    if (checkBoundary.horizontal == 'right') {
      newDesiredPosition.horizontal = HorizontalAlignment.LEFT;
    }
    if (checkBoundary.vertical == 'top') {
      newDesiredPosition.vertical = VerticalAlignment.BOTTOM;
    }
    if (checkBoundary.vertical == 'bottom') {
      newDesiredPosition.vertical = VerticalAlignment.TOP;
    }
    return newDesiredPosition;
  }

  private offSetToAlignCenter(popUp: HTMLElement, nextTo: HTMLElement) {
    return (nextTo.offsetWidth - popUp.offsetWidth) / 2;
  }

  private getBoundary(element: HTMLElement) {
    let boundaryOffset = $$(element).offset();
    let toAddVertically;
    if (element.tagName.toLowerCase() == 'body') {
      toAddVertically = Math.max(element.scrollHeight, element.offsetHeight);
    } else if (element.tagName.toLowerCase() == 'html') {
      toAddVertically = Math.max(element.clientHeight, element.scrollHeight, element.offsetHeight);
    } else {
      toAddVertically = element.offsetHeight;
    }
    return {
      top: boundaryOffset.top,
      left: boundaryOffset.left,
      right: boundaryOffset.left + element.offsetWidth,
      bottom: boundaryOffset.top + toAddVertically
    };
  }

  private checkForOutOfBoundary(popUpBoundary: IElementBoundary, boundary: IElementBoundary) {
    let ret = {
      vertical: 'ok',
      horizontal: 'ok'
    };
    if (popUpBoundary.top < boundary.top) {
      ret.vertical = 'top';
    }
    if (popUpBoundary.bottom > boundary.bottom) {
      ret.vertical = 'bottom';
    }
    if (popUpBoundary.left < boundary.left) {
      ret.horizontal = 'left';
    }
    if (popUpBoundary.right > boundary.right) {
      ret.horizontal = 'right';
    }
    return ret;
  }
}
