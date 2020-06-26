import test from "ava";
import sinon, { SinonSandbox } from "sinon";
import { TestEnvironment, TestEnvironmentConfig, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import TagManager from '../../../src/managers/tagManager/page/TagManager';
import { ConfigIntegrationKind } from '../../../src/models/AppConfig';
import Random from '../../support/tester/Random';
import EventsTestHelper from '../../support/tester/EventsTestHelper';

const sinonSandbox: SinonSandbox = sinon.sandbox.create();

test.beforeEach(async () => {
    await TestEnvironment.initialize();
    TestEnvironment.mockInternalOneSignal();
});

test.afterEach(() => {
    sinonSandbox.restore();
});

test('calling `syncTags` results in remote tag update with sendTags', async t => {
    const mockTags = { tag1: 1, tag2: 2 };
    const sendTagsSpy = sinonSandbox.stub(OneSignal, "sendTags").resolves();
    OneSignal.context.tagManager.storeTagValuesToUpdate(mockTags);
    await OneSignal.context.tagManager.syncTags();
    t.is(sendTagsSpy.callCount, 1);
    t.true(sendTagsSpy.getCall(0).calledWith(mockTags));
});

test('`downloadTags` results in remote getTags call', async t => {
    const getTagsSpy = sinonSandbox.stub(OneSignal, "getTags").resolves({});
    await TagManager.downloadTags();
    t.is(getTagsSpy.callCount, 1);
});

test('subscribing through category slidedown accept button calls syncTags', async t => {
    const testConfig: TestEnvironmentConfig = {
      httpOrHttps: HttpHttpsEnvironment.Https,
      integration: ConfigIntegrationKind.Custom,
      pushIdentifier: 'granted',
      stubSetTimeout: true
    };

    const appId = Random.getRandomUuid();
    const stubs = await TestEnvironment.setupOneSignalWithStubs(sinonSandbox, testConfig, t);
    const eventsHelper = new EventsTestHelper(sinonSandbox);
    eventsHelper.simulateSlidedownAllowAfterShown();
    eventsHelper.simulateNativeAllowAfterShown();

    const accepted = new Promise(resolve => {
      OneSignal.on(OneSignal.EVENTS.TEST_TAGS_SENT, () => {
        t.is(stubs.syncTagsSpy.callCount, 1);
        resolve();
      });
    });

    const initPromise = OneSignal.init({
      appId,
      promptOptions: {
        slidedown: {
          enabled: true,
          autoPrompt: true,
          categories : {
              tags : [{ tag: "tag", label: "Tag" }]
          }
        }
      },
      autoResubscribe: false,
    });
    await initPromise;
    await accepted;
});

