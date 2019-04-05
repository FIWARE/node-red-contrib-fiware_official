/* eslint-env node, mocha */

require('should');
const http = require('../src/http.js');

const helper = require('node-red-node-test-helper');
const testedNode = require('../src/nodes/NGSI/entity/entity.js');

const data = require('./test_data.json');

helper.init(require.resolve('node-red'));

describe('NGSI Node', function() {
  const ENDPOINT = 'http://localhost:1026';
  const TENANT = 'test';
  const HEADERS = {
    'Fiware-Service': TENANT
  };

  before(done => {
    http.post(`${ENDPOINT}/v2/entities/`, data, HEADERS).then(() => {
      helper.startServer(done);
    });
  });

  afterEach(function(done) {
    helper.unload();
    done();
  });

  after(function(done) {
    http.del(`${ENDPOINT}/v2/entities/${data.id}`, HEADERS).then(() => {
      helper.stopServer(done);
    });
  });

  it('should be loaded', function(done) {
    const flow = [{ id: 'testedNode', type: 'NGSI-Entity', name: 'tested' }];

    helper.load(testedNode, flow, function() {
      const testedNode = helper.getNode('testedNode');
      testedNode.should.have.property('name', 'tested');
      done();
    });
  });

  it('should retrieve Entity', function(done) {
    const flow = [
      {
        id: 'testedNode',
        type: 'NGSI-Entity',
        name: 'tested',
        wires: [['helperNode']],
        endpoint: ENDPOINT,
        service: TENANT,
        protocol: 'V2' // V2 for the time being. LD also supported
      },
      { id: 'helperNode', type: 'helper' }
    ];

    const entityId =
      'urn:ngsi-ld:AgriCrop:df72dc57-1eb9-42a3-88a9-8647ecc954b4';

    helper.load(testedNode, flow, function test() {
      const helperNode = helper.getNode('helperNode');
      const testedNode = helper.getNode('testedNode');

      helperNode.on('input', function(msg) {
        const entity = JSON.parse(msg.payload);
        entity.should.have.property('id', entityId);
        done();
      });

      testedNode.on('call:error', () => {
        done('Error called on node!!');
      });

      testedNode.receive({ payload: entityId });
    });
  });
});