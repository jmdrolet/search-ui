import { DefaultResultTemplate } from '../../src/ui/Templates/DefaultResultTemplate';
import { FakeResults } from '../Fake';
import { TemplateCache } from '../../src/ui/Templates/TemplateCache';
import { Template } from '../../src/ui/Templates/Template';
import { IQueryResult } from '../../src/rest/QueryResult';
import { Simulate } from '../Simulate';
export function DefaultResultTemplateTest() {
  describe('DefaultResultTemplate', () => {
    let result: IQueryResult;

    beforeEach(() => {
      result = FakeResults.createFakeResult();
    });

    afterEach(() => {
      result = null;
    });

    it('should be able to return the correct type', () => {
      expect(new DefaultResultTemplate().getType()).toEqual('DefaultResultTemplate');
    });

    describe('if the template cache is empty', () => {

      it('should be able to instantiate to string', () => {
        expect(() => new DefaultResultTemplate().instantiateToString(result)).not.toThrowError();
      });

      it('should be able to instantiate to fallback template', () => {
        let created = new DefaultResultTemplate().instantiateToString(result);
        expect(created).toEqual(new DefaultResultTemplate().getFallbackTemplate());
      });
    });

    // Once again, PhantomJS is not properly setting a static module (TemplateCache) correctly on each test.
    // Works perfectly in a normal browser.
    if (!Simulate.isPhantomJs()) {
      describe('if the template cache is not empty', () => {
        let template: Template;
        let dataToString = (result: IQueryResult) => `<div class="CoveoResultLink"></div>`;

        beforeEach(() => {
          template = new Template(dataToString);
          TemplateCache.registerTemplate('dummy', template, true, true);
        });

        afterEach(() => {
          TemplateCache.unregisterTemplate('dummy');
          template = null;
        });

        it('should be able to instantiate to string if there is something in the cache', () => {
          let created = new DefaultResultTemplate().instantiateToString(result);
          expect(created).toEqual(dataToString(result));
        });

        describe('if there\'s template with conditions', () => {
          let templateWithCondition: Template;

          beforeEach(() => {
            templateWithCondition = new Template(() => `Hello world`);
          });

          afterEach(() => {
            templateWithCondition = null;
          });

          it('should order templates with conditions first', () => {
            // Test that the Hello world template is rendered before the fallback template
            templateWithCondition.condition = () => true;
            TemplateCache.registerTemplate('dummy2', templateWithCondition, true, true);
            let created = new DefaultResultTemplate().instantiateToString(result);
            expect(created).toEqual(`Hello world`);
            TemplateCache.unregisterTemplate('dummy2');
          });

          it('should order template with fields to match first', () => {
            // Test that the Hello world template is rendered before the fallback template
            result.raw['foo'] = 'bar';
            templateWithCondition.fieldsToMatch = [
              { field: 'foo', values: ['bar'] }
            ];
            TemplateCache.registerTemplate('dummy2', templateWithCondition, true, true);
            let created = new DefaultResultTemplate().instantiateToString(result);
            expect(created).toEqual(`Hello world`);
            TemplateCache.unregisterTemplate('dummy2');
          });

          it('should still fallback on default template if condition does not match', () => {
            templateWithCondition.condition = () => false;
            TemplateCache.registerTemplate('dummy2', templateWithCondition, true, true);
            let created = new DefaultResultTemplate().instantiateToString(result);
            expect(created).toEqual(dataToString(result));
            TemplateCache.unregisterTemplate('dummy2');
          });

          it('should still fallback on default template if fields to match does not match', () => {
            result.raw['foo'] = 'nomatch';
            templateWithCondition.fieldsToMatch = [
              { field: 'foo', values: ['bar'] }
            ];
            TemplateCache.registerTemplate('dummy2', templateWithCondition, true, true);
            let created = new DefaultResultTemplate().instantiateToString(result);
            expect(created).toEqual(dataToString(result));
            TemplateCache.unregisterTemplate('dummy2');
          });

          it('should render only a roled template when a role is passed', () => {
            const tableHeader = new Template(() => 'Epic table header');
            tableHeader.role = 'table-header';
            TemplateCache.registerTemplate('tableHeader', tableHeader, true, true);
            const instantiatedTemplate = new DefaultResultTemplate().instantiateToString({}, { role: 'table-header' });
            expect(instantiatedTemplate).toEqual('Epic table header');
            TemplateCache.unregisterTemplate('tableHeader');
          });

          it('should render a fallback roled template if no appropriate template with role is found', () => {
            const instantiatedTemplate = new DefaultResultTemplate().instantiateToString({}, {
              role: 'table-header'
            });
            expect(instantiatedTemplate).toEqual(new DefaultResultTemplate().getFallbackTemplateForRole('table-header'));
          });
        });
      });
    }
  });
}