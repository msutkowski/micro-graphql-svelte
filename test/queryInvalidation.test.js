import React, { Component, createElement } from "react";
import Enzyme, { shallow, render, mount } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
Enzyme.configure({ adapter: new Adapter() });

import ClientMock from "./clientMock";
import { Client, query, mutation, setDefaultClient } from "../index-local";
import { basicQuery, basicQueryWithVariables } from "./graphqlConstants";

const client1 = new ClientMock("endpoint1");
const client2 = new ClientMock("endpoint2");
const client3 = new ClientMock("endpoint3");

setDefaultClient(client1);

beforeEach(() => {
  client1.reset();
  client2.reset();
  client3.reset();
});

const DEFAULT_CACHE_SIZE = 10;

const getComponent = (...args) =>
  @query(...args)
  class extends Component {
    render = () => null;
  };

const BasicQuery = getComponent(props => ({
  query: basicQuery
}));

const basicQueryWithVariablesPacket = props => ({
  query: basicQueryWithVariables,
  variables: { page: props.page }
});

test("Static query never re-fires", () => {
  let obj = mount(<BasicQuery unused={0} />);

  expect(client1.queriesRun).toBe(1);
  obj.setProps({ unused: 1 });
  expect(client1.queriesRun).toBe(1);
});

test("Query with variables re-fires when props change", async () => {
  let Component = getComponent(basicQueryWithVariablesPacket);
  let obj = mount(<Component page={1} />);

  expect(client1.queriesRun).toBe(1);
  obj.setProps({ page: 2 });
  expect(client1.queriesRun).toBe(2);
});

test("Query with variables does not re-fire when other props change", async () => {
  let Component = getComponent(basicQueryWithVariablesPacket);
  let obj = mount(<Component page={1} unused={10} />);

  expect(client1.queriesRun).toBe(1);
  obj.setProps({ unused: 2 });
  expect(client1.queriesRun).toBe(1);
});

test("Default cache size", async () => {
  let Component = getComponent(basicQueryWithVariablesPacket);
  let obj = mount(<Component page={1} unused={10} />);

  Array.from({ length: 9 }).forEach((x, i) => obj.setProps({ page: i + 2 }));
  expect(client1.queriesRun).toBe(10);

  Array.from({ length: 9 }).forEach((x, i) => obj.setProps({ page: 10 - i - 1 }));
  expect(client1.queriesRun).toBe(10);
});

test("Override cache size", async () => {
  let Component = getComponent(basicQueryWithVariablesPacket, { cacheSize: 2 });
  let obj = mount(<Component page={1} unused={10} />);

  //3 is a cache ejection, cache is now 2,3
  Array.from({ length: 2 }).forEach((x, i) => obj.setProps({ page: i + 2 }));
  expect(client1.queriesRun).toBe(3);

  //call 2, cache hit, cache is now 2,3
  //call 1, cache miss
  Array.from({ length: 2 }).forEach((x, i) => obj.setProps({ page: 3 - i - 1 }));
  expect(client1.queriesRun).toBe(4);
});

//TODO: remove when deprecation is gone
test("Default cache size with deprecated client", async () => {
  let Component = getComponent(client3, basicQueryWithVariablesPacket);
  let obj = mount(<Component page={1} unused={10} />);

  Array.from({ length: 9 }).forEach((x, i) => obj.setProps({ page: i + 2 }));
  expect(client3.queriesRun).toBe(10);

  Array.from({ length: 9 }).forEach((x, i) => obj.setProps({ page: 10 - i - 1 }));
  expect(client3.queriesRun).toBe(10);
});

//TODO: remove when deprecation is gone
test("Override cache size with deprecated client", async () => {
  let Component = getComponent(client3, basicQueryWithVariablesPacket, { cacheSize: 2 });
  let obj = mount(<Component page={1} unused={10} />);

  //3 is a cache ejection, cache is now 2,3
  Array.from({ length: 2 }).forEach((x, i) => obj.setProps({ page: i + 2 }));
  expect(client3.queriesRun).toBe(3);

  //call 2, cache hit, cache is now 2,3
  //call 1, cache miss
  Array.from({ length: 2 }).forEach((x, i) => obj.setProps({ page: 3 - i - 1 }));
  expect(client3.queriesRun).toBe(4);
});

test("Default cache size with overridden client", async () => {
  let Component = getComponent(basicQueryWithVariablesPacket, { client: client2 });
  let obj = mount(<Component page={1} unused={10} />);

  Array.from({ length: 9 }).forEach((x, i) => obj.setProps({ page: i + 2 }));
  expect(client2.queriesRun).toBe(10);

  Array.from({ length: 9 }).forEach((x, i) => obj.setProps({ page: 10 - i - 1 }));
  expect(client2.queriesRun).toBe(10);
});

test("Override cache size with overridden client", async () => {
  let Component = getComponent(basicQueryWithVariablesPacket, { cacheSize: 2, client: client2 });
  let obj = mount(<Component page={1} unused={10} />);

  //3 is a cache ejection, cache is now 2,3
  Array.from({ length: 2 }).forEach((x, i) => obj.setProps({ page: i + 2 }));
  expect(client2.queriesRun).toBe(3);

  //call 2, cache hit, cache is now 2,3
  //call 1, cache miss
  Array.from({ length: 2 }).forEach((x, i) => obj.setProps({ page: 3 - i - 1 }));
  expect(client2.queriesRun).toBe(4);
});

test("shouldQueryUpdate works 1", async () => {
  let Component = getComponent(basicQueryWithVariablesPacket, { shouldQueryUpdate: ({ props }) => props.shouldRun });
  let obj = mount(<Component page={1} unused={10} />);
  expect(client1.queriesRun).toBe(1);

  Array.from({ length: 9 }).forEach((x, i) => obj.setProps({ page: i + 2, shouldRun: false }));
  expect(client1.queriesRun).toBe(1);

  Array.from({ length: 9 }).forEach((x, i) => obj.setProps({ page: 10 - i - 1, shouldRun: false }));
  expect(client1.queriesRun).toBe(1);
});

test("shouldQueryUpdate works 2", async () => {
  let Component = getComponent(basicQueryWithVariablesPacket, { shouldQueryUpdate: ({ props }) => props.page % 2 });
  let obj = mount(<Component page={1} unused={10} />);
  expect(client1.queriesRun).toBe(1);

  Array.from({ length: 9 }).forEach((x, i) => obj.setProps({ page: i + 2 }));
  expect(client1.queriesRun).toBe(5);

  Array.from({ length: 9 }).forEach((x, i) => obj.setProps({ page: 10 - i - 1 }));
  expect(client1.queriesRun).toBe(5);
});
