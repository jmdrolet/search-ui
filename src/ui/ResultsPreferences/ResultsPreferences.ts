import { Component } from '../Base/Component';
import { ComponentOptions } from '../Base/ComponentOptions';
import { ComponentOptionsModel } from '../../models/ComponentOptionsModel';
import { IComponentBindings } from '../Base/ComponentBindings';
import { LocalStorageUtils } from '../../utils/LocalStorageUtils';
import { PreferencesPanelEvents } from '../../events/PreferencesPanelEvents';
import { analyticsActionCauseList, IAnalyticsPreferencesChangeMeta } from '../Analytics/AnalyticsActionListMeta';
import { Initialization } from '../Base/Initialization';
import { Assert } from '../../misc/Assert';
import { l } from '../../strings/Strings';
import { $$ } from '../../utils/Dom';
import * as _ from 'underscore';
import { exportGlobally } from '../../GlobalExports';
import { Defer } from '../../misc/Defer';
import { Checkbox } from '../FormWidgets/Checkbox';
import { RadioButton } from '../FormWidgets/RadioButton';
import { FormGroup } from '../FormWidgets/FormGroup';
import { IFormWidgetsSelectable } from '../FormWidgets/FormWidgets';

export interface IResultsPreferencesOptions {
  enableOpenInOutlook?: boolean;
  enableOpenInNewWindow?: boolean;
  enableQuerySyntax?: boolean;
}

export interface IPossiblePreferences {
  openInOutlook?: boolean;
  alwaysOpenInNewWindow?: boolean;
  enableQuerySyntax?: boolean;
}

/**
 * The ResultsPreferences component allows the end user to select preferences related to the search results. These
 * preferences are then saved in the local storage of the end user.
 *
 * This component is normally accessible through the {@link Settings} menu. Its usual location in the DOM is inside the
 * {@link PreferencesPanel} component.
 *
 * See also the {@link ResultsFiltersPreferences} component.
 */
export class ResultsPreferences extends Component {
  static ID = 'ResultsPreferences';

  static doExport = () => {
    exportGlobally({
      'ResultsPreferences': ResultsPreferences
    });
  }

  /**
   * The options for the component
   * @componentOptions
   */
  static options: IResultsPreferencesOptions = {

    /**
     * Specifies whether to make the option to open results in Microsoft Outlook available.
     *
     * Default value is `false`
     */
    enableOpenInOutlook: ComponentOptions.buildBooleanOption({ defaultValue: false }),
    /**
     * Specifies whether to make the option to open results in a new window available.
     *
     * Default value is `true`
     */
    enableOpenInNewWindow: ComponentOptions.buildBooleanOption({defaultValue: true}),
    /**
     * Specifies whether to make the option to enable the end user to control the query syntax available.
     *
     * Default value is `false`
     */
    enableQuerySyntax: ComponentOptions.buildBooleanOption({defaultValue: false})
  };

  public preferences: IPossiblePreferences;
  private preferencePanelLocalStorage: LocalStorageUtils<IPossiblePreferences>;
  private preferencesPanel: HTMLElement;
  private preferencePanelCheckboxInputs: { [label: string]: Checkbox } = {};
  private preferencePanelRadioInputs: { [label: string]: RadioButton } = {};

  /**
   * Creates a new ResultsPreference component.
   * @param element The HTMLElement on which to instantiate the component.
   * @param options The options for the ResultsPreferences component.
   * @param bindings The bindings that the component requires to function normally. If not set, these will be
   * automatically resolved (with a slower execution time).
   */
  constructor(public element: HTMLElement, public options: IResultsPreferencesOptions, public bindings: IComponentBindings) {
    super(element, ResultsPreferences.ID, bindings);

    this.options = ComponentOptions.initComponentOptions(element, ResultsPreferences, options);

    this.preferencesPanel = $$(this.element).closest(Component.computeCssClassNameForType('PreferencesPanel'));
    this.preferencePanelLocalStorage = new LocalStorageUtils(ResultsPreferences.ID);
    Assert.exists(this.componentOptionsModel);
    Assert.exists(window.localStorage);
    Assert.exists(this.preferencesPanel);

    this.preferences = this.preferencePanelLocalStorage.load() || {};
    this.adjustPreferencesToComponentConfig();

    ComponentOptions.initComponentOptions(this.element, ResultsPreferences, this.options);

    this.updateComponentOptionsModel();

    this.bind.on(this.preferencesPanel, PreferencesPanelEvents.savePreferences, () => this.save());
    this.bind.on(this.preferencesPanel, PreferencesPanelEvents.exitPreferencesWithoutSave, () => this.exitWithoutSave());

    this.buildCheckboxesInput();
    this.buildRadiosInput();
  }

  /**
   * Saves the current state of the ResultsPreferences component in the local storage.
   */
  public save() {
    this.fromInputToPreferences();
    this.logger.info('Saving preferences', this.preferences);
    this.preferencePanelLocalStorage.save(this.preferences);
    this.updateComponentOptionsModel();
  }

  public exitWithoutSave() {
    this.fromPreferencesToCheckboxInput();
  }

  private updateComponentOptionsModel() {
    const resultLinkOption = _.pick(this.preferences, 'enableOpenInOutlook', 'enableOpenInNewWindow');
    const searchBoxOption = _.pick(this.preferences, 'enableQuerySyntax');
    this.componentOptionsModel.set(ComponentOptionsModel.attributesEnum.resultLink, resultLinkOption);
    this.componentOptionsModel.set(ComponentOptionsModel.attributesEnum.searchBox, searchBoxOption);
  }

  private buildRadiosInput() {
    if (this.options.enableQuerySyntax) {
      const radios = _.map([l('On'), l('Off'), l('Automatic')], (label) => {
        const radio = new RadioButton((radioButtonInstance) => {
          this.fromPreferenceChangeEventToUsageAnalyticsLog(radioButtonInstance.isSelected() ? 'selected' : 'unselected', label);
          this.save();
          this.queryController.executeQuery({
            closeModalBox: false
          })
        }, label, 'coveo-results-preferences-query-syntax');
        this.preferencePanelRadioInputs[label] = radio;
        return radio;
      });
      const formGroup = new FormGroup(radios, l('EnableQuerySyntax'));
      $$(this.element).append(formGroup.build());
      radios[2].select();
    }

    this.fromPreferencesToRadioInput();
  }

  private buildCheckboxesInput() {

    const createCheckbox = (label: string) => {
      const checkbox = new Checkbox((checkboxInstance) => {
        this.fromPreferenceChangeEventToUsageAnalyticsLog(checkboxInstance.isSelected() ? 'selected' : 'unselected', label);
        this.save();
        this.queryController.executeQuery({
          closeModalBox: false
        });
      }, label);
      this.preferencePanelCheckboxInputs[label] = checkbox;
      return checkbox;
    };

    const checkboxes: Checkbox[] = [];

    if (this.options.enableOpenInOutlook) {
      checkboxes.push(createCheckbox(l('OpenInOutlookWhenPossible')));

    }
    if (this.options.enableOpenInNewWindow) {
      checkboxes.push(createCheckbox(l('AlwaysOpenInNewWindow')));
    }

    this.element.appendChild(new FormGroup(checkboxes, l('ResultLink')).build());
    this.fromPreferencesToCheckboxInput();
  }

  private fromInputToPreferences() {
    this.preferences = {
      openInOutlook: false,
      alwaysOpenInNewWindow: false,
      enableQuerySyntax: undefined
    };

    _.each(this.preferencePanelCheckboxInputs, (checkbox: Checkbox, label: string) => {
      if (this.isSelected(l('OpenInOutlookWhenPossible'), label, checkbox)) {
        this.preferences.openInOutlook = true;
      }
      if (this.isSelected(l('AlwaysOpenInNewWindow'), label, checkbox)) {
        this.preferences.alwaysOpenInNewWindow = true;
      }
    });
    _.each(this.preferencePanelRadioInputs, (radio: RadioButton, label: string)=> {
      if (this.isSelected(l('On'), label, radio)) {
        this.preferences.enableQuerySyntax = true;
      }
      if (this.isSelected(l('Off'), label, radio)) {
        this.preferences.enableQuerySyntax = false;
      }
      if (this.isSelected(l('Automatic'), label, radio)) {
        delete this.preferences.enableQuerySyntax;
      }
    });
  }

  private fromPreferencesToCheckboxInput() {
    if (this.preferences.openInOutlook) {
      this.preferencePanelCheckboxInputs[l('OpenInOutlookWhenPossible')].select();
    }
    if (this.preferences.alwaysOpenInNewWindow) {
      this.preferencePanelCheckboxInputs[l('AlwaysOpenInNewWindow')].select();
    }
  }

  private fromPreferencesToRadioInput() {
    if (this.preferences.enableQuerySyntax != null) {
      if (this.preferences.enableQuerySyntax === true) {
        this.preferencePanelRadioInputs[l('On')].select();
      } else if (this.preferences.enableQuerySyntax === false) {
        this.preferencePanelRadioInputs[l('Off')].select();
      } else {
        this.preferencePanelRadioInputs[l('Automatic')].select();
      }
    } else {
      this.preferencePanelRadioInputs[l('Automatic')].select();
    }
  }

  private fromPreferenceChangeEventToUsageAnalyticsLog(type: 'selected' | 'unselected', preference: string) {
    this.usageAnalytics.logCustomEvent<IAnalyticsPreferencesChangeMeta>(analyticsActionCauseList.preferencesChange, { preferenceName: preference, preferenceType: type }, this.element);
    this.usageAnalytics.logSearchEvent<IAnalyticsPreferencesChangeMeta>(analyticsActionCauseList.preferencesChange, { preferenceName: preference, preferenceType: type });
  }

  private adjustPreferencesToComponentConfig() {
    // This method is used when there are illogical configuration between what's saved in local storage (the preferences)
    // and how the component is configured.
    // This can happen if an admin change the component configuration after end users have already selected a preferences.
    // We need to adapt the saved preferences to what's actually available in the component
    let needToSave = false;
    if (this.preferences.alwaysOpenInNewWindow && !this.options.enableOpenInNewWindow) {
      this.preferences.alwaysOpenInNewWindow = null;
      needToSave = true;
    }

    if (this.preferences.openInOutlook && !this.options.enableOpenInOutlook) {
      this.preferences.openInOutlook = null;
      needToSave = true;
    }

    if (this.preferences.enableQuerySyntax && !this.options.enableQuerySyntax) {
      this.preferences.enableQuerySyntax = null;
      needToSave = true;
    }

    if (needToSave) {
      Defer.defer(() => {
        this.save();
      });
    }
  }

  private isSelected(checkingFor: string, label: string, input: IFormWidgetsSelectable) {
    return checkingFor == label && input.isSelected();
  }
}

Initialization.registerAutoCreateComponent(ResultsPreferences);
